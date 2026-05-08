import {
  DxBadge,
  DxEmptyState,
  DxTable,
  DxTime,
  mono,
  type DxTableColumn,
} from "@situ/web-ui";
import type { ReactNode } from "react";
import { MarkdownText } from "../../shared/markdown-text";
import * as s from "../../styles.css";

export type ProjectIndexViewStatus =
  | "running"
  | "stopped"
  | "stale"
  | "unhealthy"
  | "missing_workspace";

export type ProjectIndexViewProject = {
  id: string;
  label: ReactNode;
  labelSort: string;
  workspace: string | null;
  objective: string | null;
  status: ProjectIndexViewStatus;
  statusReason?: ReactNode;
  lastSeen: string | null;
  openAction: ReactNode;
};

export type ProjectIndexViewMode = "ready" | "checking" | "empty" | "error";

export function ProjectIndexView({
  projects,
  mode = "ready",
  errorMessage,
}: {
  projects: ProjectIndexViewProject[];
  mode?: ProjectIndexViewMode;
  errorMessage?: ReactNode;
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
      />
    );
  }

  return (
    <DxTable
      columns={projectColumns}
      rows={projects}
      getRowKey={({ row }) => row.id}
      emptyLabel="No local projects found"
      density="compact"
      stickyHeader
      sortable
    />
  );
}

const projectColumns: Array<DxTableColumn<ProjectIndexViewProject>> = [
  {
    id: "project",
    header: "Project",
    width: "28%",
    renderCell: ({ row }) => (
      <div className={s.projectCell}>
        {row.label}
        <span className={s.projectId}>{row.id}</span>
      </div>
    ),
    sortValue: ({ row }) => row.labelSort,
  },
  {
    id: "status",
    header: "Status",
    width: "120px",
    renderCell: ({ row }) => (
      <div className={s.projectStatus}>
        <ProjectStatusBadge status={row.status} />
        {row.statusReason && <span>{row.statusReason}</span>}
      </div>
    ),
    sortValue: ({ row }) => statusSortValue({ status: row.status }),
  },
  {
    id: "workspace",
    header: "Workspace",
    renderCell: ({ row }) => (
      <span className={s.projectPath}>{row.workspace ?? "Not configured yet"}</span>
    ),
    sortValue: ({ row }) => row.workspace ?? "",
  },
  {
    id: "objective",
    header: "Objective",
    renderCell: ({ row }) => (
      <MarkdownText
        value={row.objective ?? "No objective yet"}
        variant="inline"
        className={s.projectPath}
      />
    ),
    sortValue: ({ row }) => row.objective ?? "",
  },
  {
    id: "updated",
    header: "Updated",
    width: "180px",
    renderCell: ({ row }) =>
      row.lastSeen ? (
        <DxTime iso={row.lastSeen} className={mono} />
      ) : (
        <span className={mono}>unknown</span>
      ),
    sortValue: ({ row }) => row.lastSeen ?? "",
  },
  {
    id: "open",
    header: "",
    width: "92px",
    renderCell: ({ row }) => row.openAction,
  },
];

function ProjectStatusBadge({ status }: { status: ProjectIndexViewStatus }) {
  if (status === "running") return <DxBadge tone="success">Running</DxBadge>;
  if (status === "stale") return <DxBadge tone="warning">Stale</DxBadge>;
  if (status === "unhealthy") return <DxBadge tone="danger">Unhealthy</DxBadge>;
  if (status === "missing_workspace") return <DxBadge tone="warning">Missing</DxBadge>;
  return <DxBadge>Stopped</DxBadge>;
}

function statusSortValue({ status }: { status: ProjectIndexViewStatus }): number {
  if (status === "running") return 0;
  if (status === "unhealthy") return 1;
  if (status === "stale") return 2;
  if (status === "missing_workspace") return 3;
  return 4;
}
