import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";

import {
  ensureRuntimeContext,
  resetRuntimeContextForTests,
} from "../../../../config/session-context";
import { getDb, resetDbForTests } from "../../../../data/db/client";
import { claudeAgentEvents, claudeAgents } from "../../../../data/db/schema";
import { ClaudeSessionReconciliationActionKind } from "./claude-session-reconciliation-action";
import { resolveStalledSessionAction } from "./resolve-stalled-session-action";
import { STALLED_RETRY_THRESHOLD } from "./should-replace-stalled-session";

const originalEnv = {
  SITU_HOME: process.env.SITU_HOME,
  SITU_REPO_PATH: process.env.SITU_REPO_PATH,
  SITU_DB_PATH: process.env.SITU_DB_PATH,
};

let tempRoot: string;

const SESSION_ATTACHED_AT = "2026-05-11T20:00:00.000Z";
const NOW_AFTER_COOLDOWN = new Date("2026-05-11T20:30:00.000Z");

describe("resolveStalledSessionAction", () => {
  beforeAll(async () => {
    resetDbForTests();
    resetRuntimeContextForTests();
    tempRoot = await mkdtemp(join(tmpdir(), "situ-resolve-stalled-"));
    const repoPath = join(tempRoot, "repo");
    const sessionHome = join(tempRoot, "situ", "sessions", "ses_resolve_stalled");
    await mkdir(repoPath, { recursive: true });
    await mkdir(sessionHome, { recursive: true });
    process.env.SITU_HOME = join(tempRoot, "situ");
    process.env.SITU_REPO_PATH = repoPath;
    process.env.SITU_DB_PATH = join(sessionHome, "session.sqlite");
    await ensureRuntimeContext({ sessionId: "ses_resolve_stalled" });
  });

  beforeEach(() => {
    resetTables();
    seedAgent();
  });

  afterAll(async () => {
    resetDbForTests();
    resetRuntimeContextForTests();
    restoreEnv();
    await rm(tempRoot, { recursive: true, force: true });
  });

  test("returns None when exhausted-retry count is below threshold", async () => {
    insertExhaustedIdles({ count: STALLED_RETRY_THRESHOLD - 1 });

    const action = await resolveStalledSessionAction({
      agentId: "manager",
      claudeSessionId: "sesn_test",
      now: NOW_AFTER_COOLDOWN,
    });

    expect(action.kind).toBe(ClaudeSessionReconciliationActionKind.None);
  });

  test("returns ReplaceStalledSession at the threshold once cooldown has elapsed", async () => {
    insertExhaustedIdles({ count: STALLED_RETRY_THRESHOLD });

    const action = await resolveStalledSessionAction({
      agentId: "manager",
      claudeSessionId: "sesn_test",
      now: NOW_AFTER_COOLDOWN,
    });

    expect(action).toEqual({
      kind: ClaudeSessionReconciliationActionKind.ReplaceStalledSession,
      oldClaudeSessionId: "sesn_test",
      exhaustedCount: STALLED_RETRY_THRESHOLD,
    });
  });

  test("holds off during the cooldown immediately after attach", async () => {
    insertExhaustedIdles({ count: STALLED_RETRY_THRESHOLD });
    const justAfterAttach = new Date("2026-05-11T20:01:00.000Z");

    const action = await resolveStalledSessionAction({
      agentId: "manager",
      claudeSessionId: "sesn_test",
      now: justAfterAttach,
    });

    expect(action.kind).toBe(ClaudeSessionReconciliationActionKind.None);
  });

  test("returns None when no agent row exists for the session", async () => {
    const action = await resolveStalledSessionAction({
      agentId: "unknown-agent",
      claudeSessionId: "sesn_test",
      now: NOW_AFTER_COOLDOWN,
    });

    expect(action.kind).toBe(ClaudeSessionReconciliationActionKind.None);
  });
});

function seedAgent(): void {
  getDb()
    .insert(claudeAgents)
    .values({
      id: "manager",
      kind: "manager",
      displayName: "Manager",
      claudeSessionId: "sesn_test",
      status: "active",
      syncVersion: 1,
      syncDeleted: false,
      createdAt: SESSION_ATTACHED_AT,
      updatedAt: SESSION_ATTACHED_AT,
    })
    .run();
}

function insertExhaustedIdles({ count }: { count: number }): void {
  const db = getDb();
  for (let i = 0; i < count; i += 1) {
    const seconds = String(i % 60).padStart(2, "0");
    const minutes = String(Math.min(20 + Math.floor(i / 60), 59)).padStart(2, "0");
    const at = `2026-05-11T20:${minutes}:${seconds}.000Z`;
    db.insert(claudeAgentEvents)
      .values({
        id: `evt-${i}`,
        agentId: "manager",
        claudeEventId: null,
        type: "session.status_idle",
        payloadJson: JSON.stringify({
          type: "session.status_idle",
          stop_reason: { type: "retries_exhausted" },
        }),
        syncVersion: 1,
        syncDeleted: false,
        createdAt: at,
      })
      .run();
  }
}

function resetTables(): void {
  const db = getDb();
  db.delete(claudeAgentEvents).run();
  db.delete(claudeAgents).run();
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
