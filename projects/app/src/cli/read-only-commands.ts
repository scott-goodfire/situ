import { existsSync } from "node:fs";
import { Database } from "bun:sqlite";

import { commandLineModule } from "../modules/command-line";
import {
  currentWorkspace,
  latestSessionEntry,
  readSessionRegistry,
  type SessionRegistryEntry,
} from "../config/session-context";
import {
  computeModule,
  type ComputeBlocker,
  type ComputeBlockerResearchTaskRow,
  type ComputeBlockerTargetRow,
} from "@situ/compute";
import { worktreeModule } from "@situ/worktrees";

type ExperimentWorktreeRow = {
  experimentId: string;
  title: string;
  worktreePath: string;
  headCommit: string | null;
  headSubject: string | null;
};

type CommonReadOptions = {
  json: boolean;
  sessionId?: string;
};

type SessionsOptions = {
  json: boolean;
  all: boolean;
};

type EventsOptions = CommonReadOptions & {
  follow: boolean;
  limit: number;
};

type Row = Record<string, unknown>;

export async function runSessionsCommand({ argv }: { argv: string[] }): Promise<number> {
  const options = parseSessionsOptions({ argv });
  const registry = await readSessionRegistry();
  const workspace = currentWorkspace();
  const sessions = (registry.sessions ?? []).filter((entry) => {
    return options.all || entry.workspaceKey === workspace.workspaceKey;
  });
  if (options.json) {
    console.log(JSON.stringify({ sessions }, null, 2));
    return 0;
  }
  if (sessions.length === 0) {
    console.log("No situ sessions found.");
    return 0;
  }
  for (const session of sessions) {
    console.log([session.sessionId, session.lastOpenedAt, session.repoPath].join("\t"));
  }
  return 0;
}

export async function runStatusCommand({ argv }: { argv: string[] }): Promise<number> {
  const options = parseCommonReadOptions({ argv });
  const entry = await resolveSessionEntry({ sessionId: options.sessionId });
  const dbStatus = readStatus({ entry });
  const worktrees = await readExperimentWorktrees({ entry });
  const status = { ...dbStatus, worktrees };
  if (options.json) {
    console.log(JSON.stringify(status, null, 2));
    return 0;
  }
  console.log(`Session ${entry.sessionId}`);
  console.log(`Repo ${entry.repoPath}`);
  console.log(`DB ${entry.dbPath}`);
  console.log(`State ${String(status.session?.status ?? "unknown")}`);
  console.log(`Objective ${String(status.session?.objective ?? "")}`);
  console.log(`Research tasks ${JSON.stringify(status.researchTasks)}`);
  console.log(`Work items ${JSON.stringify(status.workItems)}`);
  console.log(`Claude runs ${JSON.stringify(status.claudeAgentRuns)}`);
  console.log(`Hypotheses ${JSON.stringify(status.hypotheses)}`);
  console.log(`Compute blockers ${JSON.stringify(status.computeBlockers)}`);
  console.log(`Worktrees ${JSON.stringify(status.worktrees)}`);
  return 0;
}

export async function runEventsCommand({ argv }: { argv: string[] }): Promise<number> {
  const options = parseEventsOptions({ argv });
  const entry = await resolveSessionEntry({ sessionId: options.sessionId });
  const seen = new Set<string>();

  const printEvents = ({ events }: { events: Row[] }) => {
    for (const event of events) {
      const key = eventKey({ event });
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      if (options.json) {
        console.log(JSON.stringify(event));
      } else {
        console.log(formatEvent({ event }));
      }
    }
  };

  printEvents({ events: readEvents({ entry, limit: options.limit }) });
  if (!options.follow) {
    return 0;
  }
  while (true) {
    await sleep({ ms: 1_000 });
    printEvents({ events: readEvents({ entry, limit: options.limit }) });
  }
}

function readStatus({ entry }: { entry: SessionRegistryEntry }): {
  session: Row | undefined;
  researchTasks: Row[];
  workItems: Row[];
  claudeAgentRuns: Row[];
  hypotheses: Row[];
  computeBlockers: ComputeBlocker[];
} {
  const db = openReadonlyDb({ entry });
  try {
    return {
      session: db
        .query("select id, title, objective, status, created_at, updated_at from session limit 1")
        .get() as Row | undefined,
      researchTasks: db
        .query(
          "select status, type, count(*) as count from research_tasks group by status, type order by status, type",
        )
        .all() as Row[],
      workItems: db
        .query(
          "select status, purpose, count(*) as count from work_items group by status, purpose order by status, purpose",
        )
        .all() as Row[],
      claudeAgentRuns: db
        .query(
          "select status, count(*) as count from claude_agent_runs group by status order by status",
        )
        .all() as Row[],
      hypotheses: db
        .query("select status, count(*) as count from hypotheses group by status order by status")
        .all() as Row[],
      computeBlockers: computeModule.blockersForPlannedResearchTasks({
        researchTasks: db
          .query(
            "select id, type, title, payload_json as payloadJson from research_tasks where status = 'planned' order by created_at, id",
          )
          .all() as ComputeBlockerResearchTaskRow[],
        computeTargets: db
          .query("select id, pool, status from compute_targets order by pool, id")
          .all() as ComputeBlockerTargetRow[],
      }),
    };
  } finally {
    db.close();
  }
}

async function readExperimentWorktrees({
  entry,
}: {
  entry: SessionRegistryEntry;
}): Promise<ExperimentWorktreeRow[]> {
  const db = openReadonlyDb({ entry });
  let rows: Array<{ id: string; title: string; worktreePath: string }>;
  try {
    rows = db
      .query(
        "select id, title, worktree_path as worktreePath from experiments where worktree_path is not null order by created_at, id",
      )
      .all() as Array<{ id: string; title: string; worktreePath: string }>;
  } finally {
    db.close();
  }
  return Promise.all(rows.map(async (row) => readWorktreeHead({ row })));
}

async function readWorktreeHead({
  row,
}: {
  row: { id: string; title: string; worktreePath: string };
}): Promise<ExperimentWorktreeRow> {
  const base = {
    experimentId: row.id,
    title: row.title,
    worktreePath: row.worktreePath,
  };
  if (!existsSync(row.worktreePath)) {
    return { ...base, headCommit: null, headSubject: null };
  }
  try {
    const output = await worktreeModule.git({
      cwd: row.worktreePath,
      args: ["log", "-1", "--format=%H%n%s"],
      trimStdout: true,
    });
    const newlineIndex = output.indexOf("\n");
    const headCommit = newlineIndex === -1 ? output : output.slice(0, newlineIndex);
    const headSubject = newlineIndex === -1 ? "" : output.slice(newlineIndex + 1);
    return { ...base, headCommit, headSubject };
  } catch {
    return { ...base, headCommit: null, headSubject: null };
  }
}

function readEvents({ entry, limit }: { entry: SessionRegistryEntry; limit: number }): Row[] {
  const db = openReadonlyDb({ entry });
  try {
    const rows = db
      .query(
        `
        select * from (
          select
            created_at as createdAt,
            'app' as source,
            cast(id as text) as id,
            type,
            message,
            payload_json as payloadJson
          from app_events
          union all
          select
            created_at as createdAt,
            'claude' as source,
            id,
            type,
            null as message,
            payload_json as payloadJson
          from claude_agent_events
        )
        order by createdAt desc, id desc
        limit $limit
      `,
      )
      .all({ $limit: limit }) as Row[];
    return rows.reverse().map(parsePayloadJson);
  } finally {
    db.close();
  }
}

function parsePayloadJson(row: Row): Row {
  const raw = typeof row.payloadJson === "string" ? row.payloadJson : "{}";
  const { payloadJson: _omit, ...rest } = row;
  return { ...rest, payload: JSON.parse(raw) as unknown };
}

async function resolveSessionEntry({
  sessionId,
}: {
  sessionId?: string;
}): Promise<SessionRegistryEntry> {
  const registry = await readSessionRegistry();
  const workspace = currentWorkspace();
  const entry = sessionId
    ? registry.sessions?.find((candidate) => candidate.sessionId === sessionId)
    : latestSessionEntry({ registry, workspaceKey: workspace.workspaceKey });
  if (!entry) {
    throw new Error(
      sessionId
        ? `situ session not found: ${sessionId}`
        : "No situ sessions found for this workspace.",
    );
  }
  return entry;
}

function openReadonlyDb({ entry }: { entry: SessionRegistryEntry }): Database {
  if (!existsSync(entry.dbPath)) {
    throw new Error(`situ session DB not found: ${entry.dbPath}`);
  }
  return new Database(entry.dbPath, { readonly: true });
}

function parseSessionsOptions({ argv }: { argv: string[] }): SessionsOptions {
  const options: SessionsOptions = { json: false, all: false };
  for (const arg of argv) {
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--all") {
      options.all = true;
      continue;
    }
    if (commandLineModule.isHelpFlag({ arg })) {
      console.log("Usage: situ sessions [--all] [--json]");
      process.exit(0);
    }
    throw new Error(`unknown option: ${arg}`);
  }
  return options;
}

function parseCommonReadOptions({ argv }: { argv: string[] }): CommonReadOptions {
  const options: CommonReadOptions = { json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--session") {
      options.sessionId = commandLineModule.requireValue({ argv, index, flag: arg });
      index += 1;
      continue;
    }
    if (commandLineModule.isHelpFlag({ arg })) {
      console.log("Usage: situ status [--session id] [--json]");
      process.exit(0);
    }
    throw new Error(`unknown option: ${arg}`);
  }
  return options;
}

function parseEventsOptions({ argv }: { argv: string[] }): EventsOptions {
  const options: EventsOptions = { json: false, follow: false, limit: 20 };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--session") {
      options.sessionId = commandLineModule.requireValue({ argv, index, flag: arg });
      index += 1;
      continue;
    }
    if (arg === "--follow") {
      options.follow = true;
      continue;
    }
    if (arg === "--limit") {
      options.limit = commandLineModule.positiveInteger({
        value: commandLineModule.requireValue({ argv, index, flag: arg }),
        flag: arg,
      });
      index += 1;
      continue;
    }
    if (commandLineModule.isHelpFlag({ arg })) {
      console.log("Usage: situ events [--session id] [--limit 20] [--follow] [--json]");
      process.exit(0);
    }
    throw new Error(`unknown option: ${arg}`);
  }
  return options;
}

function formatEvent({ event }: { event: Row }): string {
  const parts = [String(event.createdAt), String(event.source), String(event.type)];
  if (event.message) {
    parts.push(String(event.message));
  }
  return parts.join("\t");
}

function eventKey({ event }: { event: Row }): string {
  return [event.source, event.id, event.createdAt].map(String).join(":");
}

async function sleep({ ms }: { ms: number }): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
