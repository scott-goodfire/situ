import { MarkdownText, ProjectIndexView, type ProjectIndexViewProject } from "@situ/web-app-ui";
import { DxBadge } from "@situ/web-ui";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AppShell } from "../../app/app-shell";
import * as s from "../../styles.css";
import { fetchProjects } from "../../project-discovery/client";
import type { ProjectSummary } from "../../project-discovery/types";

export function ProjectIndex() {
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    refetchInterval: 2_000,
  });
  const projects = projectsQuery.data?.projects ?? [];
  const error = projectsQuery.error ? errorMessage({ error: projectsQuery.error }) : undefined;

  return (
    <AppShell topBarActions={<DxBadge>{projects.length} projects</DxBadge>}>
      {error && (
        <p className={s.status} data-tone="danger">
          {error}
        </p>
      )}
      <ProjectIndexView
        projects={projects.map(projectView)}
        mode={projectsQuery.isPending && projects.length === 0 ? "checking" : "ready"}
      />
    </AppShell>
  );
}

function projectView(project: ProjectSummary): ProjectIndexViewProject {
  const route = projectRoute({ project });
  return {
    id: project.project_id,
    label: projectLink({ project, route, className: s.projectLink }),
    labelSort: project.label,
    workspace: project.workspace,
    objective: project.objective_title,
    status: project.status,
    statusReason: project.status_reason,
    lastSeen: project.last_seen_at,
    openAction: projectLink({ project, route, className: s.projectOpen, label: "Open" }),
  };
}

type ProjectRouteTarget =
  | {
      kind: "workspace";
      workspaceId: string;
    }
  | {
      kind: "project";
      projectId: string;
      workspaceId: string;
    };

function projectRoute({ project }: { project: ProjectSummary }): ProjectRouteTarget {
  const workspaceId = project.workspace_id ?? project.project_id;
  if (project.workspace_id && project.workspace_id !== project.project_id) {
    return {
      kind: "project",
      workspaceId,
      projectId: project.project_id,
    };
  }

  return {
    kind: "workspace",
    workspaceId,
  };
}

function projectLink({
  project,
  route,
  className,
  label = project.label,
}: {
  project: ProjectSummary;
  route: ProjectRouteTarget;
  className: string;
  label?: string;
}) {
  if (route.kind === "project") {
    return (
      <Link
        className={className}
        params={{ workspaceId: route.workspaceId, projectId: route.projectId }}
        to="/workspaces/$workspaceId/projects/$projectId"
      >
        <MarkdownText value={label} variant="inline" allowLinks={false} />
      </Link>
    );
  }

  return (
    <Link
      className={className}
      params={{ workspaceId: route.workspaceId }}
      to="/workspaces/$workspaceId"
    >
      <MarkdownText value={label} variant="inline" allowLinks={false} />
    </Link>
  );
}

function errorMessage({ error }: { error: unknown }): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
