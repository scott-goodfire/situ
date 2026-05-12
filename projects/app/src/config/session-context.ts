import { mkdir, writeFile } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { DateTime } from "luxon";
import { z } from "zod";
import { dateTimeModule } from "../modules/date-time";
import { jsonModule } from "../modules/json";
import { sessionIdFromEnv } from "./session-id";

const sessionRegistryEntrySchema = z.object({
  sessionId: z.string(),
  workspaceKey: z.string(),
  repoPath: z.string(),
  dbPath: z.string(),
  createdAt: z.string(),
  lastOpenedAt: z.string(),
});

const sessionRegistrySchema = z.object({
  sessions: z.array(sessionRegistryEntrySchema).optional(),
});

export type SessionRuntimeContext = {
  sessionId: string;
  workspaceKey: string;
  repoPath: string;
  home: string;
  sessionHome: string;
  sqlitePath: string;
  metadataPath: string;
  registryPath: string;
  replicacheName: string;
};

export type SessionRuntimeOptions = {
  sessionId?: string;
};

export type SessionRegistryEntry = {
  sessionId: string;
  workspaceKey: string;
  repoPath: string;
  dbPath: string;
  createdAt: string;
  lastOpenedAt: string;
};

export type SessionRegistry = {
  sessions?: SessionRegistryEntry[];
};

type PreparedRuntimeSession = {
  sessionId: string;
  workspaceKey: string;
  repoPath: string;
  home: string;
  sessionHome: string;
  sqlitePath: string;
  metadataPath: string;
  registryPath: string;
  registry: SessionRegistry;
  entry: SessionRegistryEntry;
};

let context: SessionRuntimeContext | undefined;

export async function ensureRuntimeContext(
  options: SessionRuntimeOptions = {},
): Promise<SessionRuntimeContext> {
  if (context) {
    return context;
  }

  const session = await prepareRuntimeSession(options);
  await persistRuntimeSession({ session });

  context = runtimeContextFromSession({ session });
  // Wire workspace packages lazily: importing the wiring modules statically
  // would form a cycle (they pull in app-events → sync → db/client → paths
  // → session-context). Dynamic imports keep the static graph acyclic.
  const [
    { configureComputePackage },
    { configureWorkItemsPackage },
    { configureResearchRecordsPackage },
  ] = await Promise.all([
    import("../data/db/configure-compute-package"),
    import("../data/db/configure-work-items-package"),
    import("../data/db/configure-research-records-package"),
  ]);
  configureComputePackage();
  configureWorkItemsPackage();
  configureResearchRecordsPackage();
  return context;
}

async function prepareRuntimeSession({
  sessionId: requestedSessionId,
}: SessionRuntimeOptions): Promise<PreparedRuntimeSession> {
  const home = runtimeLocalStateHome();
  const repoPath = canonicalWorkspace({
    value: process.env.SITU_REPO_PATH ?? process.cwd(),
  });
  const workspaceKey = workspaceKeyForPath({ path: repoPath });
  const registryPath = join(home, "registry.json");
  const registry = await readRegistry({ path: registryPath });
  const sessionId = resolveRuntimeSessionId({
    requestedSessionId,
  });
  const sessionHome = join(home, "sessions", sessionId);
  const sqlitePath = dbPathOverride() ?? join(sessionHome, "session.sqlite");
  const metadataPath = join(sessionHome, "metadata.json");
  const entry = createSessionRegistryEntry({
    sessionId,
    workspaceKey,
    repoPath,
    sqlitePath,
    registry,
    now: dateTimeModule.nowIso(),
  });

  return {
    sessionId,
    workspaceKey,
    repoPath,
    home,
    sessionHome,
    sqlitePath,
    metadataPath,
    registryPath,
    registry,
    entry,
  };
}

export function getRuntimeContext(): SessionRuntimeContext {
  if (!context) {
    throw new Error("situ runtime context has not been initialized.");
  }
  return context;
}

export function maybeRuntimeContext(): SessionRuntimeContext | undefined {
  return context;
}

export function resetRuntimeContextForTests(): void {
  context = undefined;
}

export function runtimeLocalStateHome(): string {
  return process.env.SITU_HOME ?? join(homedir(), ".situ");
}

export function dbPathOverride(): string | null {
  const value = process.env.SITU_DB_PATH?.trim();
  return value ? value : null;
}

export function migrationSessionId(): string {
  return sessionIdFromEnv() ?? "manual";
}

export function currentWorkspace(): {
  repoPath: string;
  workspaceKey: string;
} {
  const repoPath = canonicalWorkspace({
    value: process.env.SITU_REPO_PATH ?? process.cwd(),
  });
  return {
    repoPath,
    workspaceKey: workspaceKeyForPath({ path: repoPath }),
  };
}

export async function readSessionRegistry(): Promise<SessionRegistry> {
  return readRegistry({ path: join(runtimeLocalStateHome(), "registry.json") });
}

export function latestSessionEntry({
  registry,
  workspaceKey,
}: {
  registry: SessionRegistry;
  workspaceKey: string;
}): SessionRegistryEntry | undefined {
  return registry.sessions
    ?.filter((entry) => entry.workspaceKey === workspaceKey)
    .sort((left, right) => right.lastOpenedAt.localeCompare(left.lastOpenedAt))[0];
}

function resolveRuntimeSessionId({
  requestedSessionId,
}: {
  requestedSessionId: string | undefined;
}): string {
  const explicitSessionId = requestedSessionId ?? sessionIdFromEnv();
  return explicitSessionId ?? createSessionId();
}

function createSessionRegistryEntry({
  sessionId,
  workspaceKey,
  repoPath,
  sqlitePath,
  registry,
  now,
}: {
  sessionId: string;
  workspaceKey: string;
  repoPath: string;
  sqlitePath: string;
  registry: SessionRegistry;
  now: string;
}): SessionRegistryEntry {
  const existing = registry.sessions?.find((entry) => entry.sessionId === sessionId);
  return {
    sessionId,
    workspaceKey,
    repoPath,
    dbPath: sqlitePath,
    createdAt: existing?.createdAt ?? now,
    lastOpenedAt: now,
  };
}

async function persistRuntimeSession({
  session,
}: {
  session: PreparedRuntimeSession;
}): Promise<void> {
  await mkdir(session.sessionHome, { recursive: true });
  await writeFile(session.metadataPath, `${JSON.stringify(session.entry, null, 2)}\n`);
  await writeRegistry({
    path: session.registryPath,
    registry: upsertRegistryEntry({ registry: session.registry, entry: session.entry }),
  });
}

function runtimeContextFromSession({
  session,
}: {
  session: PreparedRuntimeSession;
}): SessionRuntimeContext {
  return {
    sessionId: session.sessionId,
    workspaceKey: session.workspaceKey,
    repoPath: session.repoPath,
    home: session.home,
    sessionHome: session.sessionHome,
    sqlitePath: session.sqlitePath,
    metadataPath: session.metadataPath,
    registryPath: session.registryPath,
    replicacheName: `situ-session-${session.sessionId}`,
  };
}

function canonicalWorkspace({ value }: { value: string }): string {
  const resolved = resolve(value);
  try {
    return realpathSync(resolved);
  } catch {
    return resolved;
  }
}

function workspaceKeyForPath({ path }: { path: string }): string {
  return createHash("sha256").update(path).digest("hex").slice(0, 16);
}

function createSessionId(): string {
  const stamp = DateTime.utc().toFormat("yyyyLLddHHmmss");
  return `ses_${stamp}_${randomUUID().slice(0, 8)}`;
}

async function readRegistry({ path }: { path: string }): Promise<SessionRegistry> {
  const record = await jsonModule.readRecordFile({ path });
  const result = sessionRegistrySchema.safeParse(record);
  return { sessions: result.success ? (result.data.sessions ?? []) : [] };
}

async function writeRegistry({
  path,
  registry,
}: {
  path: string;
  registry: SessionRegistry;
}): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(registry, null, 2)}\n`);
}

function upsertRegistryEntry({
  registry,
  entry,
}: {
  registry: SessionRegistry;
  entry: SessionRegistryEntry;
}): SessionRegistry {
  const sessions = (registry.sessions ?? []).filter(
    (candidate) => candidate.sessionId !== entry.sessionId,
  );
  sessions.push(entry);
  sessions.sort((left, right) => right.lastOpenedAt.localeCompare(left.lastOpenedAt));
  return { sessions };
}
