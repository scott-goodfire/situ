import { Database } from "bun:sqlite";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";

import { currentWorkspace } from "../config/session-context";
import { runSessionsCommand, runStatusCommand } from "./read-only-commands";

const originalEnv = {
  SITU_HOME: process.env.SITU_HOME,
  SITU_REPO_PATH: process.env.SITU_REPO_PATH,
};

let tempRoot: string | undefined;

describe("read-only CLI commands", () => {
  afterEach(async () => {
    restoreEnv();
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
      tempRoot = undefined;
    }
  });

  test("sessions and status resolve the latest session from SITU_REPO_PATH", async () => {
    const fixture = await createSessionFixture();

    process.env.SITU_REPO_PATH = fixture.otherRepoPath;
    const wrongSessions = await withCapturedConsole(() => runSessionsCommand({ argv: ["--json"] }));
    expect(JSON.parse(wrongSessions.stdout.join("\n"))).toEqual({ sessions: [] });
    await expect(runStatusCommand({ argv: ["--json"] })).rejects.toThrow(
      "No situ sessions found for this workspace.",
    );

    process.env.SITU_REPO_PATH = fixture.labRepoPath;
    const sessions = await withCapturedConsole(() => runSessionsCommand({ argv: ["--json"] }));
    expect(sessions.value).toBe(0);
    expect(JSON.parse(sessions.stdout.join("\n"))).toMatchObject({
      sessions: [{ sessionId: fixture.sessionId, repoPath: fixture.labRepoPath }],
    });

    const status = await withCapturedConsole(() => runStatusCommand({ argv: ["--json"] }));
    expect(status.value).toBe(0);
    expect(JSON.parse(status.stdout.join("\n"))).toMatchObject({
      session: { id: fixture.sessionId, status: "active" },
      researchTasks: [{ status: "verified", type: "exploit", count: 1 }],
      computeBlockers: [],
    });
  });

  test("status reports planned tasks blocked by missing compute pools", async () => {
    const fixture = await createSessionFixture({ plannedComputePool: "gpu" });

    process.env.SITU_REPO_PATH = fixture.labRepoPath;
    const status = await withCapturedConsole(() => runStatusCommand({ argv: ["--json"] }));

    expect(status.value).toBe(0);
    expect(JSON.parse(status.stdout.join("\n"))).toMatchObject({
      computeBlockers: [
        {
          kind: "missing_pool",
          researchTaskId: "task_waiting_for_gpu",
          pool: "gpu",
          totalTargets: 0,
          idleTargets: 0,
        },
      ],
    });
  });
});

async function createSessionFixture({
  plannedComputePool,
}: {
  plannedComputePool?: string;
} = {}): Promise<{
  labRepoPath: string;
  otherRepoPath: string;
  sessionId: string;
}> {
  tempRoot = await mkdtemp(join(tmpdir(), "situ-read-only-commands-"));
  const stateHome = join(tempRoot, "state");
  const labRepoPath = join(tempRoot, "laboratory", "spelling-corrector-test");
  const otherRepoPath = join(tempRoot, "situ-checkout");
  const sessionId = "ses_read_only_test";
  const sessionHome = join(stateHome, "sessions", sessionId);
  const dbPath = join(sessionHome, "session.sqlite");
  await mkdir(labRepoPath, { recursive: true });
  await mkdir(otherRepoPath, { recursive: true });
  await mkdir(sessionHome, { recursive: true });

  process.env.SITU_HOME = stateHome;
  process.env.SITU_REPO_PATH = labRepoPath;
  const workspace = currentWorkspace();

  await writeFile(
    join(stateHome, "registry.json"),
    `${JSON.stringify(
      {
        sessions: [
          {
            sessionId,
            workspaceKey: workspace.workspaceKey,
            repoPath: workspace.repoPath,
            dbPath,
            createdAt: "2026-05-11T00:00:00.000Z",
            lastOpenedAt: "2026-05-11T00:01:00.000Z",
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  createStatusDb({ dbPath, plannedComputePool, sessionId });

  return { labRepoPath: workspace.repoPath, otherRepoPath, sessionId };
}

function createStatusDb({
  dbPath,
  plannedComputePool,
  sessionId,
}: {
  dbPath: string;
  plannedComputePool?: string;
  sessionId: string;
}): void {
  const db = new Database(dbPath);
  try {
    db.exec(`
      create table session (
        id text primary key,
        title text not null,
        objective text not null,
        status text not null,
        created_at text not null,
        updated_at text not null
      );
      create table research_tasks (
        id text primary key,
        title text not null,
        payload_json text not null default '{}',
        status text not null,
        type text not null,
        created_at text not null
      );
      create table work_items (
        status text not null,
        purpose text not null
      );
      create table claude_agent_runs (
        status text not null
      );
      create table hypotheses (
        status text not null
      );
      create table compute_targets (
        id text primary key,
        pool text not null,
        status text not null
      );
    `);
    db.query(
      "insert into session (id, title, objective, status, created_at, updated_at) values ($id, 'Test', 'Objective', 'active', '2026-05-11T00:00:00.000Z', '2026-05-11T00:01:00.000Z')",
    ).run({ $id: sessionId });
    db.exec(`
      insert into research_tasks (id, title, payload_json, status, type, created_at)
        values ('task_verified', 'Verified task', '{}', 'verified', 'exploit', '2026-05-11T00:00:00.000Z');
      insert into work_items (status, purpose) values ('done', 'claude.manager_research_project');
      insert into claude_agent_runs (status) values ('complete');
      insert into hypotheses (status) values ('accepted');
    `);
    if (plannedComputePool) {
      db.query(
        "insert into research_tasks (id, title, payload_json, status, type, created_at) values ('task_waiting_for_gpu', 'Waiting for GPU', $payloadJson, 'planned', 'explore', '2026-05-11T00:00:01.000Z')",
      ).run({ $payloadJson: JSON.stringify({ compute: { pool: plannedComputePool } }) });
    }
  } finally {
    db.close();
  }
}

function restoreEnv(): void {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

async function withCapturedConsole<T>(
  fn: () => Promise<T>,
): Promise<{ value: T; stdout: string[] }> {
  const originalLog = console.log;
  const stdout: string[] = [];
  console.log = (value?: unknown) => {
    stdout.push(String(value));
  };
  try {
    return { value: await fn(), stdout };
  } finally {
    console.log = originalLog;
  }
}
