import type { TaskRecord } from "@situ/protocol";
import { DxBadge, DxSection, DxTable, type DxBadgeTone, type DxTableColumn } from "@situ/web-ui";
import { Link } from "@tanstack/react-router";
import { tasksForProject } from "../../../selectors/tasks";
import * as s from "../../../styles.css";
import type { ProjectWorkspaceData } from "../types";

export function TasksPage({ data }: { data: ProjectWorkspaceData }) {
  const tasks = tasksForProject({ data });
  const columns = taskColumns({ projectId: data.projectId, agents: data.agents });

  return (
    <DxSection title="Tasks">
      <DxTable
        columns={columns}
        rows={tasks}
        getRowKey={({ row }) => row.id}
        emptyLabel="No tasks yet"
        density="compact"
        stickyHeader
        sortable
        getRowTone={({ row }) => taskRowTone({ status: row.status })}
      />
    </DxSection>
  );
}

function taskColumns({
  projectId,
  agents,
}: {
  projectId: string;
  agents: { id: string; display_name: string }[];
}): Array<DxTableColumn<TaskRecord>> {
  const agentName = (id: string | null | undefined): string => {
    if (!id) return "—";
    return agents.find((agent) => agent.id === id)?.display_name ?? id;
  };

  return [
    {
      id: "task",
      header: "Task",
      width: "32%",
      renderCell: ({ row }) => (
        <div className={s.recordCell}>
          <Link
            className={s.recordLink}
            to="/projects/$projectId/tasks/$taskId"
            params={{ projectId, taskId: row.id }}
          >
            {row.title}
          </Link>
          <span className={s.recordId}>{row.id}</span>
        </div>
      ),
      sortValue: ({ row }) => row.title,
    },
    {
      id: "kind",
      header: "Kind",
      width: "120px",
      renderCell: ({ row }) => <DxBadge>{row.kind}</DxBadge>,
      sortValue: ({ row }) => row.kind,
    },
    {
      id: "status",
      header: "Status",
      width: "130px",
      renderCell: ({ row }) => (
        <DxBadge tone={statusTone({ status: row.status })}>
          {row.status.replace(/_/g, " ")}
        </DxBadge>
      ),
      sortValue: ({ row }) => statusSortValue({ status: row.status }),
    },
    {
      id: "priority",
      header: "Priority",
      width: "100px",
      renderCell: ({ row }) => (
        <DxBadge tone={priorityTone({ priority: row.priority })}>{row.priority}</DxBadge>
      ),
      sortValue: ({ row }) => prioritySortValue({ priority: row.priority }),
    },
    {
      id: "assignee",
      header: "Assignee",
      width: "150px",
      renderCell: ({ row }) => <span>{agentName(row.assignee_id)}</span>,
      sortValue: ({ row }) => row.assignee_id ?? "",
    },
    {
      id: "source",
      header: "Source",
      width: "100px",
      renderCell: ({ row }) => <span>{row.source_kind}</span>,
      sortValue: ({ row }) => row.source_kind,
    },
  ];
}

function statusTone({ status }: { status: TaskRecord["status"] }): DxBadgeTone {
  if (status === "in_progress") return "warning";
  if (status === "done") return "success";
  if (status === "abandoned") return "neutral";
  if (status === "failed") return "danger";
  return "neutral";
}

function statusSortValue({ status }: { status: TaskRecord["status"] }): number {
  if (status === "in_progress") return 0;
  if (status === "backlog") return 1;
  if (status === "done") return 2;
  if (status === "abandoned") return 3;
  return 4;
}

function priorityTone({
  priority,
}: {
  priority: TaskRecord["priority"];
}): DxBadgeTone {
  if (priority === "urgent") return "danger";
  if (priority === "high") return "warning";
  return "neutral";
}

function prioritySortValue({
  priority,
}: {
  priority: TaskRecord["priority"];
}): number {
  if (priority === "urgent") return 0;
  if (priority === "high") return 1;
  if (priority === "normal") return 2;
  return 3;
}

function taskRowTone({ status }: { status: TaskRecord["status"] }) {
  if (status === "failed") return "danger" as const;
  if (status === "in_progress") return "warning" as const;
  return "neutral" as const;
}
