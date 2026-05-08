import { access, readFile, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, resolve } from "node:path";
import { Hono } from "hono";
import { openSqliteDatabase, type SqliteDatabase } from "./sqlite";
import type {
  ProjectListResponse,
  ProjectResponse,
  ProjectSessionResponse,
  ProjectSessionStatus,
  ProjectSummary,
  SessionConnection,
} from "../project-discovery/types";

type DiscoveryApiOptions = {
  situHome?: string;
};

type DiscoveryContext = {
  situHome: string;
};

type AppRecord = {
  pid: number;
  port: number;
  token: string;
  url: string;
  started_at: string;
};

type SessionReadResult =
  | { kind: "found"; session: SessionConnection }
  | { kind: "invalid" }
  | { kind: "missing" };

type ProjectStatusReason =
  | "app_healthy"
  | "session_healthy"
  | "session_health_failed"
  | "invalid_session_file"
  | "workspace_missing"
  | "no_active_session";

type ProjectStatusDetails = {
  status: ProjectSessionStatus;
  reason: ProjectStatusReason;
};

type ProjectMetadata = {
  projectId: string;
  workspaceId: string | null;
  repoPath: string | null;
  objectiveTitle: string | null;
  updatedAt: string | null;
  activeSessionStartedAt: string | null;
  readStatus: "found" | "missing";
};

type ProductProjectRow = {
  project_id: string;
  workspace_id: string;
  title: string | null;
  objective: string | null;
  project_updated_at: string | null;
  repo_path: string | null;
  active_session_created_at: string | null;
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
        ? await readRunningSession({ discoveryContext, project })
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
  const metadata = await readProductProjectMetadata({ discoveryContext });
  const projectIds = new Set(metadata.map((project) => project.projectId));
  const projectDirectoryIds = await listProjectDirectoryIds({ discoveryContext });
  for (const projectId of projectDirectoryIds) {
    projectIds.add(projectId);
  }

  const projects = await Promise.all(
    Array.from(projectIds).map(async (projectId) =>
      projectSummary({
        discoveryContext,
        projectId,
        metadata:
          metadata.find((project) => project.projectId === projectId) ??
          emptyProjectMetadata({ projectId, readStatus: "missing" }),
      }),
    ),
  );

  return projects.sort(compareProjects);
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

  const metadata = (await readProductProjectMetadata({ discoveryContext })).find(
    (project) => project.projectId === projectId,
  );
  if (!metadata) {
    const projectDirectoryIds = await listProjectDirectoryIds({ discoveryContext });
    if (!projectDirectoryIds.includes(projectId)) {
      return null;
    }
  }

  return projectSummary({
    discoveryContext,
    projectId,
    metadata: metadata ?? emptyProjectMetadata({ projectId, readStatus: "missing" }),
  });
}

async function projectSummary({
  discoveryContext,
  projectId,
  metadata,
}: {
  discoveryContext: DiscoveryContext;
  projectId: string;
  metadata: ProjectMetadata;
}): Promise<ProjectSummary> {
  const readResult = await readSessionRecord({ discoveryContext, projectId });
  if (readResult.kind === "found") {
    const healthy = await pingSession({ session: readResult.session });
    const statusDetails = runningStatusDetails({ healthy, source: "session" });
    const workspace = readResult.session.workspace || metadata.repoPath;

    return {
      project_id: projectId,
      label: projectLabel({ projectId, workspace }),
      workspace,
      objective_title: metadata.objectiveTitle,
      status: statusDetails.status,
      status_reason: statusReasonLabel({ reason: statusDetails.reason }),
      started_at: readResult.session.started_at,
      last_seen_at: latestTimestamp({
        values: [readResult.session.started_at, metadata.updatedAt],
      }),
      url: healthy ? readResult.session.url : null,
    };
  }

  const app = await readLiveApp({ discoveryContext });
  const appCanServeProject =
    app !== null &&
    metadata.repoPath !== null &&
    metadata.activeSessionStartedAt !== null;
  if (appCanServeProject && metadata.readStatus === "found") {
    const statusDetails = runningStatusDetails({ healthy: true, source: "app" });
    return {
      project_id: projectId,
      label: projectLabel({ projectId, workspace: metadata.repoPath }),
      workspace: metadata.repoPath,
      objective_title: metadata.objectiveTitle,
      status: statusDetails.status,
      status_reason: statusReasonLabel({ reason: statusDetails.reason }),
      started_at: metadata.activeSessionStartedAt ?? app.started_at,
      last_seen_at: latestTimestamp({
        values: [metadata.activeSessionStartedAt, metadata.updatedAt, app.started_at],
      }),
      url: app.url,
    };
  }

  const workspaceMissing = metadata.repoPath
    ? !(await pathExists({ path: metadata.repoPath }))
    : false;
  const statusDetails = storedProjectStatusDetails({
    metadata,
    readResult,
    workspaceMissing,
  });

  return {
    project_id: projectId,
    label: projectLabel({ projectId, workspace: metadata.repoPath }),
    workspace: metadata.repoPath,
    objective_title: metadata.objectiveTitle,
    status: statusDetails.status,
    status_reason: statusReasonLabel({ reason: statusDetails.reason }),
    started_at: null,
    last_seen_at: metadata.updatedAt,
    url: null,
  };
}

async function readRunningSession({
  discoveryContext,
  project,
}: {
  discoveryContext: DiscoveryContext;
  project: ProjectSummary;
}): Promise<SessionConnection | null> {
  const readResult = await readSessionRecord({
    discoveryContext,
    projectId: project.project_id,
  });
  if (readResult.kind === "found") {
    const healthy = await pingSession({ session: readResult.session });
    return healthy ? readResult.session : null;
  }

  const app = await readLiveApp({ discoveryContext });
  if (!app || !project.workspace) {
    return null;
  }

  return {
    project_id: project.project_id,
    workspace: project.workspace,
    pid: app.pid,
    port: app.port,
    token: app.token,
    url: app.url,
    started_at: project.started_at ?? app.started_at,
  };
}

async function readProductProjectMetadata({
  discoveryContext,
}: {
  discoveryContext: DiscoveryContext;
}): Promise<ProjectMetadata[]> {
  const path = productDatabasePath({ discoveryContext });
  const exists = await pathExists({ path });
  if (!exists) {
    return [];
  }

  try {
    const database = await openSqliteDatabase({
      path,
      fileMustExist: true,
      readonly: true,
    });
    try {
      if (!isProductDatabase({ database })) {
        return [];
      }

      return (
        database.all(`
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
        `) as ProductProjectRow[]
      ).map(metadataFromProductRow);
    } finally {
      database.close();
    }
  } catch {
    return [];
  }
}

function metadataFromProductRow(row: ProductProjectRow): ProjectMetadata {
  return {
    projectId: row.project_id,
    workspaceId: row.workspace_id,
    repoPath: row.repo_path,
    objectiveTitle: row.title ?? row.objective,
    updatedAt: row.project_updated_at,
    activeSessionStartedAt: row.active_session_created_at,
    readStatus: "found",
  };
}

async function listProjectDirectoryIds({
  discoveryContext,
}: {
  discoveryContext: DiscoveryContext;
}): Promise<string[]> {
  const projectIds = new Set<string>();
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
  } catch (error) {
    if (!isMissingPathError({ error })) {
      throw error;
    }
  }

  return Array.from(projectIds);
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

async function readLiveApp({
  discoveryContext,
}: {
  discoveryContext: DiscoveryContext;
}): Promise<AppRecord | null> {
  try {
    const raw = await readFile(appPath({ discoveryContext }), "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    const app = appRecordFromUnknown({ value: parsed });
    if (!app) {
      return null;
    }
    return (await pingApp({ app })) ? app : null;
  } catch {
    return null;
  }
}

function appRecordFromUnknown({ value }: { value: unknown }): AppRecord | null {
  if (!isRecord(value)) {
    return null;
  }
  if (
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
  return pingLocalUrl({ url: session.url, token: session.token });
}

async function pingApp({ app }: { app: AppRecord }): Promise<boolean> {
  return pingLocalUrl({ url: app.url, token: app.token });
}

async function pingLocalUrl({
  url,
  token,
}: {
  url: string;
  token: string;
}): Promise<boolean> {
  const abort = new AbortController();
  const timeout = setTimeout(() => {
    abort.abort();
  }, 800);

  try {
    const response = await fetch(new URL("/health", url), {
      headers: {
        authorization: `Bearer ${token}`,
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

function isProductDatabase({ database }: { database: SqliteDatabase }): boolean {
  try {
    const row = database.get("PRAGMA table_info(projects)") as
      | { name: string }[]
      | unknown;
    const rows = Array.isArray(row) ? row : database.all("PRAGMA table_info(projects)");
    return rows.some(
      (column) =>
        isRecord(column) && column.name === "workspace_id",
    );
  } catch {
    return false;
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
}: {
  projectId: string;
  workspace: string | null;
}): string {
  if (!workspace) {
    return projectId;
  }

  return basename(workspace) || workspace;
}

function runningStatusDetails({
  healthy,
  source,
}: {
  healthy: boolean;
  source: "app" | "session";
}): ProjectStatusDetails {
  if (healthy) {
    return {
      status: "running",
      reason: source === "app" ? "app_healthy" : "session_healthy",
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

  return {
    status: "stopped",
    reason: "no_active_session",
  };
}

function statusReasonLabel({
  reason,
}: {
  reason: ProjectStatusReason;
}): string {
  if (reason === "app_healthy") {
    return "App health check passed";
  }

  if (reason === "session_healthy") {
    return "Session health check passed";
  }

  if (reason === "session_health_failed") {
    return "Session or app health check failed";
  }

  if (reason === "workspace_missing") {
    return "Workspace path no longer exists";
  }

  if (reason === "invalid_session_file") {
    return "Session file is invalid";
  }

  return "No active session found";
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

function productDatabasePath({
  discoveryContext,
}: {
  discoveryContext: DiscoveryContext;
}): string {
  return resolve(discoveryContext.situHome, "situ.sqlite");
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

function appPath({
  discoveryContext,
}: {
  discoveryContext: DiscoveryContext;
}): string {
  return resolve(discoveryContext.situHome, "app.json");
}

function defaultSituHome(): string {
  return resolve(homedir(), ".situ");
}

function emptyProjectMetadata({
  projectId,
  readStatus,
}: {
  projectId: string;
  readStatus: ProjectMetadata["readStatus"];
}): ProjectMetadata {
  return {
    projectId,
    workspaceId: null,
    repoPath: null,
    objectiveTitle: null,
    updatedAt: null,
    activeSessionStartedAt: null,
    readStatus,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isMissingPathError({ error }: { error: unknown }): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
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
