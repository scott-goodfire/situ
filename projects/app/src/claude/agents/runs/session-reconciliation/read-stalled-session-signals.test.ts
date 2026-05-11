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
import { readStalledSessionSignals } from "./read-stalled-session-signals";

const originalEnv = {
  SITU_HOME: process.env.SITU_HOME,
  SITU_REPO_PATH: process.env.SITU_REPO_PATH,
  SITU_DB_PATH: process.env.SITU_DB_PATH,
};

let tempRoot: string;

describe("readStalledSessionSignals", () => {
  beforeAll(async () => {
    resetDbForTests();
    resetRuntimeContextForTests();
    tempRoot = await mkdtemp(join(tmpdir(), "situ-stalled-signals-"));
    const repoPath = join(tempRoot, "repo");
    const sessionHome = join(tempRoot, "situ", "sessions", "ses_stalled_signals");
    await mkdir(repoPath, { recursive: true });
    await mkdir(sessionHome, { recursive: true });
    process.env.SITU_HOME = join(tempRoot, "situ");
    process.env.SITU_REPO_PATH = repoPath;
    process.env.SITU_DB_PATH = join(sessionHome, "session.sqlite");
    await ensureRuntimeContext({ sessionId: "ses_stalled_signals" });
  });

  beforeEach(() => {
    resetTables();
    seedAgent({ id: "manager", updatedAt: "2026-05-11T20:00:00.000Z" });
  });

  afterAll(async () => {
    resetDbForTests();
    resetRuntimeContextForTests();
    restoreEnv();
    await rm(tempRoot, { recursive: true, force: true });
  });

  test("returns zero counts when there are no events", async () => {
    const signals = await readStalledSessionSignals({ agentId: "manager" });
    expect(signals.exhaustedRetryCountSinceAttach).toBe(0);
    expect(signals.hadSuccessAfterMostRecentExhausted).toBe(false);
    expect(signals.sessionAttachedAt).toEqual(new Date("2026-05-11T20:00:00.000Z"));
  });

  test("counts only exhausted-retry events after the session attached", async () => {
    insertExhaustedIdle({ agentId: "manager", at: "2026-05-11T19:50:00.000Z" });
    insertExhaustedIdle({ agentId: "manager", at: "2026-05-11T20:01:00.000Z" });
    insertExhaustedIdle({ agentId: "manager", at: "2026-05-11T20:02:00.000Z" });

    const signals = await readStalledSessionSignals({ agentId: "manager" });
    expect(signals.exhaustedRetryCountSinceAttach).toBe(2);
  });

  test("ignores status_idle events with non-exhausted stop reasons", async () => {
    insertIdle({
      agentId: "manager",
      at: "2026-05-11T20:01:00.000Z",
      stopReason: { type: "model_complete" },
    });
    insertExhaustedIdle({ agentId: "manager", at: "2026-05-11T20:02:00.000Z" });

    const signals = await readStalledSessionSignals({ agentId: "manager" });
    expect(signals.exhaustedRetryCountSinceAttach).toBe(1);
  });

  test("reports a successful turn after the most recent exhaustion", async () => {
    insertExhaustedIdle({ agentId: "manager", at: "2026-05-11T20:01:00.000Z" });
    insertModelRequestEnd({
      agentId: "manager",
      at: "2026-05-11T20:02:00.000Z",
      isError: false,
    });
    insertExhaustedIdle({ agentId: "manager", at: "2026-05-11T20:03:00.000Z" });

    const signals = await readStalledSessionSignals({ agentId: "manager" });
    expect(signals.exhaustedRetryCountSinceAttach).toBe(2);
    expect(signals.hadSuccessAfterMostRecentExhausted).toBe(false);
  });

  test("reports success when a successful turn lands after the latest exhaustion", async () => {
    insertExhaustedIdle({ agentId: "manager", at: "2026-05-11T20:01:00.000Z" });
    insertModelRequestEnd({
      agentId: "manager",
      at: "2026-05-11T20:02:00.000Z",
      isError: false,
    });

    const signals = await readStalledSessionSignals({ agentId: "manager" });
    expect(signals.hadSuccessAfterMostRecentExhausted).toBe(true);
  });

  test("treats is_error model_request_end events as not successful", async () => {
    insertExhaustedIdle({ agentId: "manager", at: "2026-05-11T20:01:00.000Z" });
    insertModelRequestEnd({
      agentId: "manager",
      at: "2026-05-11T20:02:00.000Z",
      isError: true,
    });

    const signals = await readStalledSessionSignals({ agentId: "manager" });
    expect(signals.hadSuccessAfterMostRecentExhausted).toBe(false);
  });
});

function seedAgent({ id, updatedAt }: { id: string; updatedAt: string }): void {
  getDb()
    .insert(claudeAgents)
    .values({
      id,
      kind: "manager",
      displayName: id,
      claudeSessionId: "sesn_seed",
      status: "active",
      syncVersion: 1,
      syncDeleted: false,
      createdAt: updatedAt,
      updatedAt,
    })
    .run();
}

function insertExhaustedIdle({ agentId, at }: { agentId: string; at: string }): void {
  insertIdle({
    agentId,
    at,
    stopReason: { type: "retries_exhausted" },
  });
}

function insertIdle({
  agentId,
  at,
  stopReason,
}: {
  agentId: string;
  at: string;
  stopReason: Record<string, unknown>;
}): void {
  getDb()
    .insert(claudeAgentEvents)
    .values({
      id: `${agentId}-${at}-idle`,
      agentId,
      claudeEventId: null,
      type: "session.status_idle",
      payloadJson: JSON.stringify({ type: "session.status_idle", stop_reason: stopReason }),
      syncVersion: 1,
      syncDeleted: false,
      createdAt: at,
    })
    .run();
}

function insertModelRequestEnd({
  agentId,
  at,
  isError,
}: {
  agentId: string;
  at: string;
  isError: boolean;
}): void {
  getDb()
    .insert(claudeAgentEvents)
    .values({
      id: `${agentId}-${at}-end`,
      agentId,
      claudeEventId: null,
      type: "span.model_request_end",
      payloadJson: JSON.stringify({
        type: "span.model_request_end",
        is_error: isError,
        model_usage: { input_tokens: isError ? 0 : 100 },
      }),
      syncVersion: 1,
      syncDeleted: false,
      createdAt: at,
    })
    .run();
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
