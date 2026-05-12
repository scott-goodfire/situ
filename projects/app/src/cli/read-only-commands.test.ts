import { Database } from "bun:sqlite";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";

import { currentWorkspace } from "../config/session-context";
import { worktreeModule } from "@situ/worktrees";
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

  test("status reports experiment worktree HEAD commits", async () => {
    const fixture = await createSessionFixture({
      experiments: [
        { id: "expt_a", title: "Tweak chunker", worktree: { commitSubject: "tweak chunker" } },
        { id: "expt_b", title: "Inspect baseline", worktree: { commitSubject: null } },
        { id: "expt_c", title: "Ghost experiment", worktree: "missing" },
        { id: "expt_d", title: "No worktree yet", worktree: "none" },
      ],
    });

    process.env.SITU_REPO_PATH = fixture.labRepoPath;
    const status = await withCapturedConsole(() => runStatusCommand({ argv: ["--json"] }));

    expect(status.value).toBe(0);
    const parsed = JSON.parse(status.stdout.join("\n")) as {
      worktrees: ReadonlyArray<{
        experimentId: string;
        title: string;
        worktreePath: string;
        headCommit: string | null;
        headSubject: string | null;
      }>;
    };
    expect(parsed.worktrees).toHaveLength(3);

    const byId = Object.fromEntries(parsed.worktrees.map((row) => [row.experimentId, row]));

    expect(byId.expt_a).toMatchObject({
      title: "Tweak chunker",
      headSubject: "tweak chunker",
    });
    expect(byId.expt_a?.headCommit).toMatch(/^[0-9a-f]{40}$/);
    expect(byId.expt_a?.headCommit).not.toBe(fixture.baseCommit);

    expect(byId.expt_b).toMatchObject({
      title: "Inspect baseline",
      headCommit: fixture.baseCommit,
      headSubject: "initial",
    });

    expect(byId.expt_c).toMatchObject({
      title: "Ghost experiment",
      headCommit: null,
      headSubject: null,
    });

    expect(byId.expt_d).toBeUndefined();
  });
});

type ExperimentSeed = {
  id: string;
  title: string;
  worktree: { commitSubject: string | null } | "missing" | "none";
};

async function createSessionFixture({
  plannedComputePool,
  experiments,
}: {
  plannedComputePool?: string;
  experiments?: ReadonlyArray<ExperimentSeed>;
} = {}): Promise<{
  labRepoPath: string;
  otherRepoPath: string;
  sessionId: string;
  baseCommit: string | undefined;
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

  let baseCommit: string | undefined;
  let experimentRows: ReadonlyArray<{ id: string; title: string; worktreePath: string | null }> =
    [];
  if (experiments && experiments.length > 0) {
    baseCommit = await initLabRepoWithCommit({ labRepoPath: workspace.repoPath });
    experimentRows = await createExperimentWorktrees({
      labRepoPath: workspace.repoPath,
      sessionHome,
      baseCommit,
      experiments,
    });
  }

  createStatusDb({ dbPath, plannedComputePool, sessionId, experimentRows });

  return { labRepoPath: workspace.repoPath, otherRepoPath, sessionId, baseCommit };
}

async function initLabRepoWithCommit({ labRepoPath }: { labRepoPath: string }): Promise<string> {
  await worktreeModule.git({ cwd: labRepoPath, args: ["init", "--initial-branch", "main"] });
  await writeFile(join(labRepoPath, "README.md"), "baseline\n");
  await worktreeModule.git({ cwd: labRepoPath, args: ["add", "README.md"] });
  await worktreeModule.git({
    cwd: labRepoPath,
    args: [
      "-c",
      "user.name=situ Test",
      "-c",
      "user.email=situ-test@local.invalid",
      "commit",
      "-m",
      "initial",
    ],
  });
  return worktreeModule.git({ cwd: labRepoPath, args: ["rev-parse", "HEAD"], trimStdout: true });
}

async function createExperimentWorktrees({
  labRepoPath,
  sessionHome,
  baseCommit,
  experiments,
}: {
  labRepoPath: string;
  sessionHome: string;
  baseCommit: string;
  experiments: ReadonlyArray<ExperimentSeed>;
}): Promise<ReadonlyArray<{ id: string; title: string; worktreePath: string | null }>> {
  const worktreesRoot = join(sessionHome, "worktrees");
  await mkdir(worktreesRoot, { recursive: true });

  const rows: Array<{ id: string; title: string; worktreePath: string | null }> = [];
  for (const seed of experiments) {
    if (seed.worktree === "none") {
      rows.push({ id: seed.id, title: seed.title, worktreePath: null });
      continue;
    }
    if (seed.worktree === "missing") {
      rows.push({
        id: seed.id,
        title: seed.title,
        worktreePath: join(worktreesRoot, seed.id),
      });
      continue;
    }
    const worktreePath = join(worktreesRoot, seed.id);
    await worktreeModule.git({
      cwd: labRepoPath,
      args: ["worktree", "add", "--detach", worktreePath, baseCommit],
    });
    if (seed.worktree.commitSubject) {
      await writeFile(join(worktreePath, "note.txt"), `${seed.id}\n`);
      await worktreeModule.git({ cwd: worktreePath, args: ["add", "note.txt"] });
      await worktreeModule.git({
        cwd: worktreePath,
        args: [
          "-c",
          "user.name=situ Test",
          "-c",
          "user.email=situ-test@local.invalid",
          "commit",
          "-m",
          seed.worktree.commitSubject,
        ],
      });
    }
    rows.push({ id: seed.id, title: seed.title, worktreePath });
  }
  return rows;
}

function createStatusDb({
  dbPath,
  plannedComputePool,
  sessionId,
  experimentRows,
}: {
  dbPath: string;
  plannedComputePool?: string;
  sessionId: string;
  experimentRows: ReadonlyArray<{ id: string; title: string; worktreePath: string | null }>;
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
      create table experiments (
        id text primary key,
        title text not null,
        worktree_path text,
        created_at text not null
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
    let createdAtCounter = 0;
    for (const row of experimentRows) {
      createdAtCounter += 1;
      const createdAt = `2026-05-11T00:0${createdAtCounter}:00.000Z`;
      db.query(
        "insert into experiments (id, title, worktree_path, created_at) values ($id, $title, $worktreePath, $createdAt)",
      ).run({
        $id: row.id,
        $title: row.title,
        $worktreePath: row.worktreePath,
        $createdAt: createdAt,
      });
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
