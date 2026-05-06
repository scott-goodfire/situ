import { access, readFile, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, resolve } from "node:path";
import { Hono } from "hono";
import {
  readProjectRegistry,
  upsertProjectRegistryRows,
  type ProjectRegistryRow,
} from "./project-registry";
import { openSqliteDatabase } from "./sqlite";
import type {
  ProjectListResponse,
  ProjectResponse,
  ProjectSessionResponse,
  ProjectSessionStatus,
  ProjectSummary,
  SessionConnection,
} from "../project-discovery/types";

type SessionReadResult =
  | { kind: "found"; session: SessionConnection }
  | { kind: "invalid" }
  | { kind: "missing" };

type ProjectStatusReason =
  | "session_healthy"
  | "session_health_failed"
  | "invalid_session_file"
  | "workspace_missing"
  | "project_database_unreadable"
  | "no_session_file";

type ProjectStatusDetails = {
  status: ProjectSessionStatus;
  reason: ProjectStatusReason;
};

type DiscoveryApiOptions = {
  situHome?: string;
};

type DiscoveryContext = {
  situHome: string;
};

type ProjectMetadata = {
  repoPath: string | null;
  objectiveTitle: string | null;
  readStatus: "found" | "missing" | "unreadable";
  updatedAt: string | null;
};

type ProjectRow = {
  title: string | null;
  workspace_id: string;
  objective: string | null;
  updated_at: string;
};

const PROJECT_ID_PATTERN = /^[a-f0-9]{16}$/;

export function createDiscoveryApi({
  situHome = defaultSituHome(),
}: DiscoveryApiOptions = {}): Hono {
  const app = new Hono();
  const discoveryContext: DiscoveryContext = {
    situHome,
  };

  app.get("/api/projects", async (context) => {
    const projects = await listProjects({ discoveryContext });
    return context.json({ projects } satisfies ProjectListResponse);
  });

  app.get("/api/projects/:projectId", async (context) => {
    const projectId = context.req.param("projectId");
    const project = await findProject({ discoveryContext, projectId });
    return context.json({ project } satisfies ProjectResponse, project ? 200 : 404);
  });

  app.get("/api/projects/:projectId/session", async (context) => {
    const projectId = context.req.param("projectId");
    const project = await findProject({ discoveryContext, projectId });
    if (!project) {
      return context.json(
        { project: null, session: null } satisfies ProjectSessionResponse,
      );
    }

    const session =
      project.status === "running"
        ? await readRunningSession({ discoveryContext, projectId })
        : null;

    return context.json({ project, session } satisfies ProjectSessionResponse);
  });

  return app;
}

async function listProjects({
  discoveryContext,
}: {
  discoveryContext: DiscoveryContext;
}): Promise<ProjectSummary[]> {
  const registryRows = await readProjectRegistry({
    situHome: discoveryContext.situHome,
  });
  const projectIds = await listProjectIds({ discoveryContext, registryRows });
  const projects = await Promise.all(
    projectIds.map((projectId) =>
      projectSummary({
        discoveryContext,
        projectId,
        registryRow: registryRows.find((row) => row.project_id === projectId) ?? null,
      }),
    ),
  );

  await syncKnownProjectsToRegistry({ discoveryContext, projects });

  return projects.sort(compareProjects);
}

async function syncKnownProjectsToRegistry({
  discoveryContext,
  projects,
}: {
  discoveryContext: DiscoveryContext;
  projects: ProjectSummary[];
}): Promise<void> {
  await upsertProjectRegistryRows({
    situHome: discoveryContext.situHome,
    rows: projects.map((project) => ({
      projectId: project.project_id,
      repoPath: project.workspace,
      label: project.label,
      lastSeenAt: project.last_seen_at,
    })),
  });
}

async function findProject({
  discoveryContext,
  projectId,
}: {
  discoveryContext: DiscoveryContext;
  projectId: string;
}): Promise<ProjectSummary | null> {
  if (!isProjectId({ value: projectId })) {
    return null;
  }

  const registryRows = await readProjectRegistry({
    situHome: discoveryContext.situHome,
  });
  const projectIds = await listProjectIds({ discoveryContext, registryRows });
  if (!projectIds.includes(projectId)) {
    return null;
  }

  return projectSummary({
    discoveryContext,
    projectId,
    registryRow: registryRows.find((row) => row.project_id === projectId) ?? null,
  });
}

async function projectSummary({
  discoveryContext,
  projectId,
  registryRow,
}: {
  discoveryContext: DiscoveryContext;
  projectId: string;
  registryRow: ProjectRegistryRow | null;
}): Promise<ProjectSummary> {
  const metadata = await readProjectMetadata({ discoveryContext, projectId });
  const workspace = metadata.repoPath ?? registryRow?.repo_path ?? null;
  const label = projectLabel({
    projectId,
    workspace,
    registryLabel: registryRow?.label ?? null,
  });
  const lastSeenAt = latestTimestamp({
    values: [
      metadata.updatedAt,
      registryRow?.last_seen_at ?? null,
      registryRow?.last_opened_at ?? null,
    ],
  });
  const readResult = await readSessionRecord({ discoveryContext, projectId });
  if (readResult.kind === "found") {
    const healthy = await pingSession({ session: readResult.session });
    const statusDetails = activeSessionStatusDetails({ healthy });
    const sessionWorkspace = readResult.session.workspace || workspace;

    return {
      project_id: projectId,
      label: projectLabel({
        projectId,
        workspace: sessionWorkspace,
        registryLabel: registryRow?.label ?? null,
      }),
      workspace: sessionWorkspace,
      objective_title: metadata.objectiveTitle,
      status: statusDetails.status,
      status_reason: statusReasonLabel({ reason: statusDetails.reason }),
      started_at: readResult.session.started_at,
      last_seen_at: latestTimestamp({
        values: [
          readResult.session.started_at,
          metadata.updatedAt,
          registryRow?.last_seen_at ?? null,
        ],
      }),
      url: healthy ? readResult.session.url : null,
    };
  }

  const workspaceMissing = workspace ? !(await pathExists({ path: workspace })) : false;
  const statusDetails = storedProjectStatusDetails({
    metadata,
    readResult,
    workspaceMissing,
  });

  return {
    project_id: projectId,
    label,
    workspace,
    objective_title: metadata.objectiveTitle,
    status: statusDetails.status,
    status_reason: statusReasonLabel({ reason: statusDetails.reason }),
    started_at: null,
    last_seen_at: lastSeenAt,
    url: null,
  };
}

async function readProjectMetadata({
  discoveryContext,
  projectId,
}: {
  discoveryContext: DiscoveryContext;
  projectId: string;
}): Promise<ProjectMetadata> {
  const path = projectDatabasePath({ discoveryContext, projectId });
  const exists = await pathExists({ path });
  if (!exists) {
    return emptyProjectMetadata({ readStatus: "missing" });
  }

  try {
    const database = await openSqliteDatabase({
      path,
      fileMustExist: true,
      readonly: true,
    });

    try {
      const project = readMaybeRow<ProjectRow>({
        database,
        sql: `
          SELECT title, workspace_id, objective, updated_at
          FROM projects
          WHERE workspace_id = ? OR id = ?
          ORDER BY updated_at DESC, id DESC
          LIMIT 1
        `,
        params: [projectId, projectId],
      });
      const workspace = project
        ? readMaybeRow<{ repo_path: string }>({
            database,
            sql: "SELECT repo_path FROM workspaces WHERE id = ? LIMIT 1",
            params: [project.workspace_id],
          })
        : null;

      return metadataFromRows({ project, workspaceRepoPath: workspace?.repo_path ?? null });
    } finally {
      database.close();
    }
  } catch {
    return emptyProjectMetadata({ readStatus: "unreadable" });
  }
}

function readMaybeRow<RowType>({
  database,
  sql,
  params = [],
}: {
  database: Awaited<ReturnType<typeof openSqliteDatabase>>;
  sql: string;
  params?: unknown[];
}): RowType | null {
  try {
    return (database.get(sql, params) as RowType | null) ?? null;
  } catch (error) {
    if (isMissingTableError({ error })) {
      return null;
    }

    throw error;
  }
}

function metadataFromRows({
  project,
  workspaceRepoPath,
}: {
  project: ProjectRow | null;
  workspaceRepoPath: string | null;
}): ProjectMetadata {
  return {
    repoPath: workspaceRepoPath,
    objectiveTitle: project?.title ?? project?.objective ?? null,
    readStatus: "found",
    updatedAt: project?.updated_at ?? null,
  };
}

async function readRunningSession({
  discoveryContext,
  projectId,
}: {
  discoveryContext: DiscoveryContext;
  projectId: string;
}): Promise<SessionConnection | null> {
  const readResult = await readSessionRecord({ discoveryContext, projectId });
  if (readResult.kind !== "found") {
    return null;
  }

  const healthy = await pingSession({ session: readResult.session });
  if (!healthy) {
    return null;
  }

  return readResult.session;
}

async function listProjectIds({
  discoveryContext,
  registryRows,
}: {
  discoveryContext: DiscoveryContext;
  registryRows: ProjectRegistryRow[];
}): Promise<string[]> {
  const projectIds = new Set(registryRows.map((row) => row.project_id));

  try {
    const entries = await readdir(projectsDirectory({ discoveryContext }), {
      withFileTypes: true,
    });
    for (const projectId of entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => isProjectId({ value: name }))) {
      projectIds.add(projectId);
    }

    return Array.from(projectIds);
  } catch (error) {
    if (isMissingPathError({ error })) {
      return Array.from(projectIds);
    }

    throw error;
  }
}

async function readSessionRecord({
  discoveryContext,
  projectId,
}: {
  discoveryContext: DiscoveryContext;
  projectId: string;
}): Promise<SessionReadResult> {
  try {
    const raw = await readFile(sessionPath({ discoveryContext, projectId }), "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    const session = sessionConnectionFromUnknown({ value: parsed, projectId });
    if (!session) {
      return { kind: "invalid" };
    }

    return { kind: "found", session };
  } catch (error) {
    if (isMissingPathError({ error })) {
      return { kind: "missing" };
    }

    if (error instanceof SyntaxError) {
      return { kind: "invalid" };
    }

    throw error;
  }
}

function sessionConnectionFromUnknown({
  value,
  projectId,
}: {
  value: unknown;
  projectId: string;
}): SessionConnection | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value.project_id !== projectId) {
    return null;
  }

  if (
    typeof value.workspace !== "string" ||
    typeof value.pid !== "number" ||
    typeof value.port !== "number" ||
    typeof value.token !== "string" ||
    typeof value.url !== "string" ||
    typeof value.started_at !== "string"
  ) {
    return null;
  }

  if (!isLocalSessionUrl({ value: value.url })) {
    return null;
  }

  return {
    project_id: projectId,
    workspace: value.workspace,
    pid: value.pid,
    port: value.port,
    token: value.token,
    url: value.url,
    started_at: value.started_at,
  };
}

async function pingSession({
  session,
}: {
  session: SessionConnection;
}): Promise<boolean> {
  const abort = new AbortController();
  const timeout = setTimeout(() => {
    abort.abort();
  }, 800);

  try {
    const response = await fetch(new URL("/health", session.url), {
      headers: {
        authorization: `Bearer ${session.token}`,
      },
      signal: abort.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function isProjectId({ value }: { value: string }): boolean {
  return PROJECT_ID_PATTERN.test(value);
}

function isLocalSessionUrl({ value }: { value: string }): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" && url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function projectLabel({
  projectId,
  workspace,
  registryLabel,
}: {
  projectId: string;
  workspace: string | null;
  registryLabel?: string | null;
}): string {
  if (!workspace) {
    return registryLabel ?? projectId;
  }

  return basename(workspace) || workspace;
}

function activeSessionStatusDetails({
  healthy,
}: {
  healthy: boolean;
}): ProjectStatusDetails {
  if (healthy) {
    return {
      status: "running",
      reason: "session_healthy",
    };
  }

  return {
    status: "unhealthy",
    reason: "session_health_failed",
  };
}

function storedProjectStatusDetails({
  metadata,
  readResult,
  workspaceMissing,
}: {
  metadata: ProjectMetadata;
  readResult: SessionReadResult;
  workspaceMissing: boolean;
}): ProjectStatusDetails {
  if (readResult.kind === "invalid") {
    return {
      status: "stale",
      reason: "invalid_session_file",
    };
  }

  if (workspaceMissing) {
    return {
      status: "missing_workspace",
      reason: "workspace_missing",
    };
  }

  if (metadata.readStatus === "unreadable") {
    return {
      status: "stale",
      reason: "project_database_unreadable",
    };
  }

  return {
    status: "stopped",
    reason: "no_session_file",
  };
}

function statusReasonLabel({
  reason,
}: {
  reason: ProjectStatusReason;
}): string {
  if (reason === "session_healthy") {
    return "Session health check passed";
  }

  if (reason === "session_health_failed") {
    return "Session file exists but the health check failed";
  }

  if (reason === "workspace_missing") {
    return "Workspace path no longer exists";
  }

  if (reason === "invalid_session_file") {
    return "Session file is invalid";
  }

  if (reason === "project_database_unreadable") {
    return "Project database could not be read";
  }

  return "No active session file found";
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

  return left.label.localeCompare(right.label);
}

function statusRank({ status }: { status: ProjectSessionStatus }): number {
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

function projectsDirectory({
  discoveryContext,
}: {
  discoveryContext: DiscoveryContext;
}): string {
  return resolve(discoveryContext.situHome, "projects");
}

function sessionPath({
  discoveryContext,
  projectId,
}: {
  discoveryContext: DiscoveryContext;
  projectId: string;
}): string {
  return resolve(projectsDirectory({ discoveryContext }), projectId, "session.json");
}

function projectDatabasePath({
  discoveryContext,
  projectId,
}: {
  discoveryContext: DiscoveryContext;
  projectId: string;
}): string {
  return resolve(projectsDirectory({ discoveryContext }), projectId, "situ.sqlite");
}

function defaultSituHome(): string {
  return resolve(homedir(), ".situ");
}

function emptyProjectMetadata({
  readStatus,
}: {
  readStatus: ProjectMetadata["readStatus"];
}): ProjectMetadata {
  return {
    repoPath: null,
    objectiveTitle: null,
    readStatus,
    updatedAt: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isMissingPathError({ error }: { error: unknown }): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function isMissingTableError({ error }: { error: unknown }): boolean {
  return error instanceof Error && error.message.includes("no such table:");
}

async function pathExists({ path }: { path: string }): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (isMissingPathError({ error })) {
      return false;
    }

    throw error;
  }
}
