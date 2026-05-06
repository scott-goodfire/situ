import { DxBadge, DxEmptyState, DxTable, mono, type DxTableColumn } from "@situ/web-ui";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { DateTime } from "luxon";
import { useMemo } from "react";
import { AppShell } from "../../app/app-shell";
import * as s from "../../styles.css";
import { fetchProjects } from "../../project-discovery/client";
import type {
  ProjectSessionStatus,
  ProjectSummary,
} from "../../project-discovery/types";

export function ProjectIndex() {
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    refetchInterval: 2_000,
  });
  const projects = projectsQuery.data?.projects ?? [];
  const columns = useMemo(projectColumns, []);
  const error = projectsQuery.error
    ? errorMessage({ error: projectsQuery.error })
    : undefined;

  return (
    <AppShell topBarActions={<DxBadge>{projects.length} projects</DxBadge>}>
      {error && (
        <p className={s.status} data-tone="danger">
          {error}
        </p>
      )}

      {projectsQuery.isPending && projects.length === 0 && (
        <DxEmptyState
          heading="Checking local Situ state"
          description="Looking for projects under local Situ storage."
        />
      )}

      {!projectsQuery.isPending && projects.length === 0 && (
        <DxEmptyState
          heading="No local Situ projects found"
          description="Start a terminal session, then refresh this page."
        />
      )}

      {projects.length > 0 && (
        <DxTable
          columns={columns}
          rows={projects}
          getRowKey={({ row }) => row.project_id}
          emptyLabel="No local projects found"
          density="compact"
          stickyHeader
          sortable
        />
      )}
    </AppShell>
  );
}

function projectColumns(): Array<DxTableColumn<ProjectSummary>> {
  return [
    {
      id: "project",
      header: "Project",
      width: "28%",
      renderCell: ({ row }) => (
        <div className={s.projectCell}>
          <Link
            className={s.projectLink}
            params={{ projectId: row.project_id }}
            to="/projects/$projectId"
          >
            {row.label}
          </Link>
          <span className={s.projectId}>{row.project_id}</span>
        </div>
      ),
      sortValue: ({ row }) => row.label,
    },
    {
      id: "status",
      header: "Status",
      width: "120px",
      renderCell: ({ row }) => (
        <div className={s.projectStatus}>
          <ProjectStatusBadge status={row.status} />
          {row.status_reason && <span>{row.status_reason}</span>}
        </div>
      ),
      sortValue: ({ row }) => statusSortValue({ status: row.status }),
    },
    {
      id: "workspace",
      header: "Workspace",
      renderCell: ({ row }) => (
        <span className={s.projectPath}>
          {row.workspace ?? "Not configured yet"}
        </span>
      ),
      sortValue: ({ row }) => row.workspace ?? "",
    },
    {
      id: "objective",
      header: "Objective",
      renderCell: ({ row }) => (
        <span className={s.projectPath}>
          {row.objective_title ?? "No objective yet"}
        </span>
      ),
      sortValue: ({ row }) => row.objective_title ?? "",
    },
    {
      id: "updated",
      header: "Updated",
      width: "180px",
      renderCell: ({ row }) => (
        <span className={mono}>{formatTimestamp({ value: row.last_seen_at })}</span>
      ),
      sortValue: ({ row }) => row.last_seen_at ?? "",
    },
    {
      id: "open",
      header: "",
      width: "92px",
      renderCell: ({ row }) => (
        <Link
          className={s.projectOpen}
          params={{ projectId: row.project_id }}
          to="/projects/$projectId"
        >
          Open
        </Link>
      ),
    },
  ];
}

function ProjectStatusBadge({ status }: { status: ProjectSessionStatus }) {
  if (status === "running") {
    return <DxBadge tone="success">Running</DxBadge>;
  }

  if (status === "stale") {
    return <DxBadge tone="warning">Stale</DxBadge>;
  }

  if (status === "unhealthy") {
    return <DxBadge tone="danger">Unhealthy</DxBadge>;
  }

  if (status === "missing_workspace") {
    return <DxBadge tone="warning">Missing</DxBadge>;
  }

  return <DxBadge>Stopped</DxBadge>;
}

function statusSortValue({ status }: { status: ProjectSessionStatus }): number {
  if (status === "running") {
    return 0;
  }

  if (status === "unhealthy") {
    return 1;
  }

  if (status === "stale") {
    return 2;
  }

  if (status === "missing_workspace") {
    return 3;
  }

  return 4;
}

function formatTimestamp({ value }: { value: string | null }): string {
  if (!value) {
    return "unknown";
  }

  return DateTime.fromISO(value).toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);
}

function errorMessage({ error }: { error: unknown }): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
