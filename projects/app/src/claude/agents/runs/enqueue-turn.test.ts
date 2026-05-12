import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { ensureRuntimeContext, resetRuntimeContextForTests } from "../../../config/session-context";
import { getDb, resetDbForTests } from "../../../data/db/client";
import { claudeAgentRuns, workItems } from "../../../data/db/schema";
import { enqueueClaudeAgentWork } from "./enqueue-turn";

const originalEnv = {
  SITU_HOME: process.env.SITU_HOME,
  SITU_REPO_PATH: process.env.SITU_REPO_PATH,
  SITU_DB_PATH: process.env.SITU_DB_PATH,
};

let tempRoot: string;

describe("enqueueClaudeAgentWork idempotency", () => {
  beforeAll(async () => {
    resetDbForTests();
    resetRuntimeContextForTests();
    tempRoot = await mkdtemp(join(tmpdir(), "situ-enqueue-turn-"));
    const sessionHome = join(tempRoot, "situ", "sessions", "ses_enqueue_test");
    await mkdir(sessionHome, { recursive: true });
    process.env.SITU_HOME = join(tempRoot, "situ");
    process.env.SITU_REPO_PATH = tempRoot;
    process.env.SITU_DB_PATH = join(sessionHome, "session.sqlite");
    await ensureRuntimeContext({ sessionId: "ses_enqueue_test" });
  });

  beforeEach(() => {
    const db = getDb();
    db.delete(claudeAgentRuns).run();
    db.delete(workItems).run();
  });

  afterAll(async () => {
    resetDbForTests();
    resetRuntimeContextForTests();
    restoreEnv();
    await rm(tempRoot, { recursive: true, force: true });
  });

  test("re-enqueue for the same target returns the existing run without throwing UNIQUE", async () => {
    const first = await enqueueClaudeAgentWork({
      purpose: "claude.scribe_session",
      content: "first narration prompt",
      targetKind: "researchProject",
      targetId: "research-project-test",
      payload: { researchProjectId: "research-project-test" },
    });

    const second = await enqueueClaudeAgentWork({
      purpose: "claude.scribe_session",
      content: "second narration prompt with different text",
      targetKind: "researchProject",
      targetId: "research-project-test",
      payload: { researchProjectId: "research-project-test" },
    });

    expect(second.workItemId).toBe(first.workItemId);
    expect(second.claudeAgentRunId).toBe(first.claudeAgentRunId);

    const runRows = await getDb()
      .select()
      .from(claudeAgentRuns)
      .where(eq(claudeAgentRuns.workItemId, first.workItemId));
    expect(runRows).toHaveLength(1);
  });
});

function restoreEnv(): void {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}
