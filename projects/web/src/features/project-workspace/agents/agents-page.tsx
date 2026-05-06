import type { AgentRecord } from "@situ/protocol";
import { DxBadge, DxSection, DxTable, mono, type DxTableColumn } from "@situ/web-ui";
import { Link } from "@tanstack/react-router";
import { DateTime } from "luxon";
import * as s from "../../../styles.css";
import type { ProjectWorkspaceData } from "../types";

export function AgentsPage({ data }: { data: ProjectWorkspaceData }) {
  const agents = data.agents.filter((agent) => agent.project_id === data.projectId);
  const columns = agentColumns({ projectId: data.projectId });

  return (
    <DxSection title="Agents">
      <DxTable
        columns={columns}
        rows={agents}
        getRowKey={({ row }) => row.id}
        emptyLabel="No agents yet"
        density="compact"
        stickyHeader
        sortable
      />
    </DxSection>
  );
}

function agentColumns({
  projectId,
}: {
  projectId: string;
}): Array<DxTableColumn<AgentRecord>> {
  return [
    {
      id: "agent",
      header: "Agent",
      width: "30%",
      renderCell: ({ row }) => (
        <div className={s.recordCell}>
          <Link
            className={s.recordLink}
            to="/projects/$projectId/agents/$agentId"
            params={{ projectId, agentId: row.id }}
          >
            {row.display_name}
          </Link>
          <span className={s.recordId}>{row.id}</span>
        </div>
      ),
      sortValue: ({ row }) => row.display_name,
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
      width: "110px",
      renderCell: ({ row }) => <StatusBadge status={row.status} />,
      sortValue: ({ row }) => row.status,
    },
    {
      id: "model",
      header: "Model",
      width: "200px",
      renderCell: ({ row }) => (
        <span className={mono}>{row.model_name ?? "—"}</span>
      ),
      sortValue: ({ row }) => row.model_name ?? "",
    },
    {
      id: "updated",
      header: "Updated",
      renderCell: ({ row }) => formatTime({ value: row.updated_at }),
      sortValue: ({ row }) => row.updated_at,
    },
  ];
}

function StatusBadge({ status }: { status: AgentRecord["status"] }) {
  if (status === "active") {
    return (
      <DxBadge tone="success" withDot>
        active
      </DxBadge>
    );
  }
  if (status === "idle") return <DxBadge>idle</DxBadge>;
  return <DxBadge tone="neutral">closed</DxBadge>;
}

function formatTime({ value }: { value: string | null }): string {
  if (!value) return "never";
  return DateTime.fromISO(value).toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);
}
