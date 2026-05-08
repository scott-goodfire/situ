import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { Database } from "bun:sqlite";

export type ProjectSessionStatus =
  | "running"
  | "stopped"
  | "unhealthy"
  | "missing_workspace"
  | "stale";

export type ProjectSummary = {
  project_id: string;
  workspace_id: string | null;
  label: string;
  workspace: string | null;
  objective_title: string | null;
  status: ProjectSessionStatus;
  status_reason: string | null;
  started_at: string | null;
  last_seen_at: string | null;
  url: string | null;
};

export type SessionConnection = {
  project_id: string;
  workspace_id: string;
  workspace: string;
  started_at: string;
};

export type RuntimeState = {
  workspaceId: string;
  workspace: string;
  startedAt: string;
};

type ProductProjectRow = {
  project_id: string;
  workspace_id: string | null;
  title: string | null;
  objective: string | null;
  project_updated_at: string | null;
  repo_path: string | null;
  active_session_created_at: string | null;
};

type ProjectMetadata = {
  projectId: string;
  workspaceId: string | null;
  repoPath: string | null;
  objectiveTitle: string | null;
  updatedAt: string | null;
  activeSessionStartedAt: string | null;
};

export function listProjects({
  getRuntime,
  listRuntimes,
  situHome,
}: {
  getRuntime: (workspaceId: string) => RuntimeState | undefined;
  listRuntimes: () => RuntimeState[];
  situHome: string;
}): ProjectSummary[] {
  const metadata = readProductProjectMetadata({ situHome });
  const summaries = metadata.map((record) => projectSummary({ getRuntime, metadata: record }));
  const knownWorkspaceIds = new Set(
    metadata
      .map((record) => record.workspaceId)
      .filter((workspaceId): workspaceId is string => Boolean(workspaceId)),
  );
  const runtimeSummaries = listRuntimes()
    .filter((runtime) => !knownWorkspaceIds.has(runtime.workspaceId))
    .map((runtime) => runtimeProjectSummary({ runtime }));

  return [...summaries, ...runtimeSummaries].sort(compareProjects);
}

export function findProject({
  getRuntime,
  projectId,
  situHome,
}: {
  getRuntime: (workspaceId: string) => RuntimeState | undefined;
  projectId: string;
  situHome: string;
}): ProjectSummary | null {
  const metadata = readProductProjectMetadata({ situHome }).find(
    (project) => project.projectId === projectId || project.workspaceId === projectId,
  );
  if (metadata) {
    return projectSummary({ getRuntime, metadata });
  }

  const runtime = getRuntime(projectId);
  return runtime ? runtimeProjectSummary({ runtime }) : null;
}

export function projectSession({
  getRuntime,
  project,
}: {
  getRuntime: (workspaceId: string) => RuntimeState | undefined;
  project: ProjectSummary;
}): SessionConnection | null {
  if (
    project.status !== "running" ||
    !project.workspace_id ||
    !project.workspace ||
    !project.started_at
  ) {
    return null;
  }

  const runtime = getRuntime(project.workspace_id);
  if (!runtime) {
    return null;
  }

  return {
    project_id: project.project_id,
    workspace_id: project.workspace_id,
    workspace: runtime.workspace,
    started_at: project.started_at,
  };
}

function runtimeProjectSummary({ runtime }: { runtime: RuntimeState }): ProjectSummary {
  return {
    project_id: runtime.workspaceId,
    workspace_id: runtime.workspaceId,
    label: projectLabel({ projectId: runtime.workspaceId, workspace: runtime.workspace }),
    workspace: runtime.workspace,
    objective_title: null,
    status: "running",
    status_reason: "App runtime is serving this workspace",
    started_at: runtime.startedAt,
    last_seen_at: runtime.startedAt,
    url: null,
  };
}

function readProductProjectMetadata({ situHome }: { situHome: string }): ProjectMetadata[] {
  const path = resolve(situHome, "situ.sqlite");
  if (!existsSync(path)) {
    return [];
  }

  let database: Database | null = null;
  try {
    database = new Database(path, { readonly: true });
    if (!isProductDatabase({ database })) {
      return [];
    }

    const rows = database
      .query(`
        SELECT
          p.id AS project_id,
          p.workspace_id AS workspace_id,
          p.title AS title,
          p.objective AS objective,
          p.updated_at AS project_updated_at,
          w.repo_path AS repo_path,
          (
            SELECT s.created_at
            FROM sessions s
            WHERE s.project_id = p.id AND s.status = 'active'
            ORDER BY s.updated_at DESC
            LIMIT 1
          ) AS active_session_created_at
        FROM projects p
        LEFT JOIN workspaces w ON w.id = p.workspace_id
        ORDER BY p.updated_at DESC, p.created_at DESC, p.id DESC
      `)
      .all() as ProductProjectRow[];

    return rows.map((row) => ({
      projectId: row.project_id,
      workspaceId: row.workspace_id,
      repoPath: row.repo_path,
      objectiveTitle: row.title ?? row.objective,
      updatedAt: row.project_updated_at,
      activeSessionStartedAt: row.active_session_created_at,
    }));
  } catch {
    return [];
  } finally {
    database?.close();
  }
}

function projectSummary({
  getRuntime,
  metadata,
}: {
  getRuntime: (workspaceId: string) => RuntimeState | undefined;
  metadata: ProjectMetadata;
}): ProjectSummary {
  const workspaceId = metadata.workspaceId;
  const runtime = workspaceId ? getRuntime(workspaceId) : undefined;
  const workspace = runtime?.workspace ?? metadata.repoPath;
  const workspaceMissing = metadata.repoPath ? !existsSync(metadata.repoPath) : false;
  const statusDetails = projectStatusDetails({
    hasActiveSession: metadata.activeSessionStartedAt !== null,
    hasRuntime: runtime !== undefined,
    workspaceMissing,
  });

  return {
    project_id: metadata.projectId,
    workspace_id: workspaceId,
    label: projectLabel({ projectId: metadata.projectId, workspace }),
    workspace,
    objective_title: metadata.objectiveTitle,
    status: statusDetails.status,
    status_reason: statusDetails.reason,
    started_at:
      statusDetails.status === "running"
        ? metadata.activeSessionStartedAt ?? runtime?.startedAt ?? null
        : null,
    last_seen_at: latestTimestamp({
      values: [metadata.activeSessionStartedAt, metadata.updatedAt, runtime?.startedAt ?? null],
    }),
    url: null,
  };
}

function projectStatusDetails({
  hasActiveSession,
  hasRuntime,
  workspaceMissing,
}: {
  hasActiveSession: boolean;
  hasRuntime: boolean;
  workspaceMissing: boolean;
}): { status: ProjectSessionStatus; reason: string } {
  if (workspaceMissing) {
    return {
      status: "missing_workspace",
      reason: "Workspace path no longer exists",
    };
  }

  if (hasActiveSession && hasRuntime) {
    return {
      status: "running",
      reason: "App runtime is serving the active session",
    };
  }

  if (hasRuntime) {
    return {
      status: "running",
      reason: "App runtime is serving this workspace",
    };
  }

  if (hasActiveSession) {
    return {
      status: "unhealthy",
      reason: "Active session recorded, but app runtime is not attached",
    };
  }

  return {
    status: "stopped",
    reason: "No active session found",
  };
}

function isProductDatabase({ database }: { database: Database }): boolean {
  try {
    const rows = database.query("PRAGMA table_info(projects)").all() as Array<{
      name: string;
    }>;
    return rows.some((column) => column.name === "workspace_id");
  } catch {
    return false;
  }
}

function projectLabel({
  projectId,
  workspace,
}: {
  projectId: string;
  workspace: string | null;
}): string {
  if (!workspace) {
    return projectId;
  }

  return basename(workspace) || workspace;
}

function latestTimestamp({ values }: { values: Array<string | null> }): string | null {
  const timestamps = values.filter((value): value is string => Boolean(value));
  if (timestamps.length === 0) {
    return null;
  }

  return timestamps.sort().at(-1) ?? null;
}

function compareProjects(left: ProjectSummary, right: ProjectSummary): number {
  const statusComparison =
    statusRank({ status: left.status }) - statusRank({ status: right.status });
  if (statusComparison !== 0) {
    return statusComparison;
  }

  const leftSeen = left.last_seen_at ?? "";
  const rightSeen = right.last_seen_at ?? "";
  if (leftSeen !== rightSeen) {
    return rightSeen.localeCompare(leftSeen);
  }

  return left.label.localeCompare(right.label);
}

function statusRank({ status }: { status: ProjectSessionStatus }): number {
  if (status === "running") return 0;
  if (status === "unhealthy") return 1;
  if (status === "stale") return 2;
  if (status === "missing_workspace") return 3;
  return 4;
}
