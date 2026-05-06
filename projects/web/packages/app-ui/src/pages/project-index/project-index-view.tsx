import {
  DxBadge,
  DxButton,
  DxEmptyState,
  DxTable,
  type DxTableColumn,
} from "@situ/web-ui";
import type { ReactNode } from "react";
import * as s from "../../styles.css";

export type ProjectIndexViewStatus =
  | "running"
  | "stopped"
  | "stale"
  | "unhealthy"
  | "missing_workspace";

export type ProjectIndexViewProject = {
  id: string;
  label: string;
  workspace: string | null;
  objective: string | null;
  status: ProjectIndexViewStatus;
  statusReason?: string;
  lastSeen: string | null;
};

export type ProjectIndexViewMode = "ready" | "checking" | "empty" | "error";

export function ProjectIndexView({
  projects,
  mode = "ready",
  errorMessage,
  onProjectOpen,
}: {
  projects: ProjectIndexViewProject[];
  mode?: ProjectIndexViewMode;
  errorMessage?: ReactNode;
  onProjectOpen?: ({ projectId }: { projectId: string }) => void;
}) {
  if (mode === "checking") {
    return (
      <DxEmptyState
        heading="Checking local Situ state"
        description="Looking for projects under local Situ storage."
      />
    );
  }

  if (mode === "error") {
    return (
      <DxEmptyState
        heading="Could not load projects"
        description={errorMessage ?? "Try refreshing the page."}
      />
    );
  }

  if (mode === "empty" || projects.length === 0) {
    return (
      <DxEmptyState
        heading="No local Situ projects found"
        description="Start a terminal session, then refresh this page."
        action={<pre className={s.commandPre}>situ start</pre>}
      />
    );
  }

  return (
    <div className={s.viewStack}>
      <header className={s.pageHeader}>
        <div>
          <h1 className={s.pageHeaderTitle}>Local Situ Projects</h1>
          <p className={s.pageHeaderSubtitle}>
            Attach-only monitors for projects found on this machine.
          </p>
        </div>
        <DxBadge>{projects.length} projects</DxBadge>
      </header>

      <DxTable
        columns={projectColumns({ onProjectOpen })}
        rows={projects}
        getRowKey={({ row }) => row.id}
        emptyLabel="No projects"
        density="compact"
        sortable
        stickyHeader
      />
    </div>
  );
}

function projectColumns({
  onProjectOpen,
}: {
  onProjectOpen?: ({ projectId }: { projectId: string }) => void;
}): Array<DxTableColumn<ProjectIndexViewProject>> {
  return [
    {
      id: "project",
      header: "Project",
      width: "30%",
      renderCell: ({ row }) => (
        <div className={s.projectCellStack}>
          <span className={s.cellTitle}>{row.label}</span>
          <span className={s.monoTertiary}>{row.id}</span>
        </div>
      ),
      sortValue: ({ row }) => row.label,
    },
    {
      id: "status",
      header: "Status",
      width: "120px",
      renderCell: ({ row }) => <StatusCell project={row} />,
      sortValue: ({ row }) => statusSortValue({ status: row.status }),
    },
    {
      id: "workspace",
      header: "Workspace",
      renderCell: ({ row }) => (
        <span className={s.monoMuted}>{row.workspace ?? "Not configured yet"}</span>
      ),
      sortValue: ({ row }) => row.workspace ?? "",
    },
    {
      id: "objective",
      header: "Objective",
      renderCell: ({ row }) => (
        <span className={s.cellMuted}>{row.objective ?? "No objective yet"}</span>
      ),
      sortValue: ({ row }) => row.objective ?? "",
    },
    {
      id: "open",
      header: "",
      width: "92px",
      renderCell: ({ row }) => (
        <DxButton
          variant="secondary"
          size="small"
          onClick={() => onProjectOpen?.({ projectId: row.id })}
        >
          Open
        </DxButton>
      ),
    },
  ];
}

function StatusCell({ project }: { project: ProjectIndexViewProject }) {
  if (project.status === "running") {
    return (
      <DxBadge tone="success" withDot>
        Running
      </DxBadge>
    );
  }

  if (project.status === "unhealthy") {
    return <DxBadge tone="danger">Unhealthy</DxBadge>;
  }

  if (project.status === "stale") {
    return <DxBadge tone="warning">Stale</DxBadge>;
  }

  if (project.status === "missing_workspace") {
    return <DxBadge tone="warning">Missing</DxBadge>;
  }

  return <DxBadge>Stopped</DxBadge>;
}

function statusSortValue({
  status,
}: {
  status: ProjectIndexViewStatus;
}): number {
  if (status === "running") return 0;
  if (status === "unhealthy") return 1;
  if (status === "stale") return 2;
  if (status === "missing_workspace") return 3;
  return 4;
}
