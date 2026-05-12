import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { ensureRuntimeContext, resetRuntimeContextForTests } from "../../config/session-context";
import { getDb, resetDbForTests } from "../../data/db/client";
import { claudeAgentRuns, feedEntries, researchProjects, workItems } from "../../data/db/schema";
import { feedEntryRepository } from "../../data/repositories/feed-entries";
import { researchProjectRepository } from "../../data/repositories/research-projects";
import { CLAUDE_SCRIBE_SESSION_WORK_ITEM_PURPOSE } from "../work-items";
import { dispatchScribeNarrationIfDue } from "./scribe-dispatch";

const originalEnv = {
  SITU_HOME: process.env.SITU_HOME,
  SITU_REPO_PATH: process.env.SITU_REPO_PATH,
  SITU_DB_PATH: process.env.SITU_DB_PATH,
};

let tempRoot: string;

describe("dispatchScribeNarrationIfDue", () => {
  beforeAll(async () => {
    resetDbForTests();
    resetRuntimeContextForTests();
    tempRoot = await mkdtemp(join(tmpdir(), "situ-scribe-dispatch-"));
    const repoPath = join(tempRoot, "repo");
    const sessionHome = join(tempRoot, "situ", "sessions", "ses_scribe_dispatch");
    await mkdir(repoPath, { recursive: true });
    await mkdir(sessionHome, { recursive: true });
    process.env.SITU_HOME = join(tempRoot, "situ");
    process.env.SITU_REPO_PATH = repoPath;
    process.env.SITU_DB_PATH = join(sessionHome, "session.sqlite");
    await ensureRuntimeContext({ sessionId: "ses_scribe_dispatch" });
  });

  beforeEach(() => {
    resetTables();
  });

  afterAll(async () => {
    resetDbForTests();
    resetRuntimeContextForTests();
    restoreEnv();
    await rm(tempRoot, { recursive: true, force: true });
  });

  test("does not enqueue when there is no active ResearchProject", async () => {
    await dispatchScribeNarrationIfDue();
    expect(scribeWorkItemCount()).toBe(0);
  });

  test("enqueues a scribe work item when there is no prior narration", async () => {
    const project = await researchProjectRepository.create({
      goal: "Exercise scribe dispatch (no prior narration).",
    });

    await dispatchScribeNarrationIfDue();

    const items = scribeWorkItems();
    expect(items).toHaveLength(1);
    expect(items[0]?.targetId).toBe(project.id);
    expect(items[0]?.status).toBe("pending");
  });

  test("enqueued scribe work item carries a non-empty content prompt", async () => {
    await researchProjectRepository.create({
      goal: "Exercise scribe dispatch (content shape).",
    });

    await dispatchScribeNarrationIfDue();

    const items = scribeWorkItems();
    expect(items).toHaveLength(1);
    const firstItem = items[0];
    if (!firstItem) {
      throw new Error("Expected one scribe work item.");
    }
    const payload = JSON.parse(firstItem.payloadJson) as { content?: unknown };
    expect(typeof payload.content).toBe("string");
    expect((payload.content as string).trim().length).toBeGreaterThan(0);
  });

  test("skips when the latest narration is within the interval", async () => {
    const project = await researchProjectRepository.create({
      goal: "Exercise scribe dispatch (recent narration).",
    });
    await feedEntryRepository.create({
      researchProjectId: project.id,
      summaryMarkdown: "Just happened.",
      severity: "info",
      windowStartedAt: new Date().toISOString(),
      windowEndedAt: new Date().toISOString(),
    });

    await dispatchScribeNarrationIfDue();

    expect(scribeWorkItemCount()).toBe(0);
  });

  test("does not enqueue a second scribe work item while an earlier one is still pending", async () => {
    const project = await researchProjectRepository.create({
      goal: "Exercise scribe dispatch (open work-item guard).",
    });

    await dispatchScribeNarrationIfDue();
    await dispatchScribeNarrationIfDue();
    await dispatchScribeNarrationIfDue();

    const items = scribeWorkItems();
    expect(items).toHaveLength(1);
    expect(items[0]?.targetId).toBe(project.id);
    expect(items[0]?.status).toBe("pending");
  });

  test("enqueues again once the latest narration is older than the interval", async () => {
    const project = await researchProjectRepository.create({
      goal: "Exercise scribe dispatch (old narration).",
    });
    const entry = await feedEntryRepository.create({
      researchProjectId: project.id,
      summaryMarkdown: "Long ago.",
      severity: "info",
      windowStartedAt: "2000-01-01T00:00:00.000Z",
      windowEndedAt: "2000-01-01T00:00:00.000Z",
    });

    // Rewrite the row's createdAt so the dispatcher sees it as ancient.
    getDb()
      .update(feedEntries)
      .set({ createdAt: "2000-01-01T00:00:00.000Z" })
      .where(eq(feedEntries.id, entry.id))
      .run();

    await dispatchScribeNarrationIfDue();

    const items = scribeWorkItems();
    expect(items).toHaveLength(1);
    expect(items[0]?.targetId).toBe(project.id);
  });
});

function scribeWorkItems() {
  return getDb()
    .select()
    .from(workItems)
    .where(eq(workItems.purpose, CLAUDE_SCRIBE_SESSION_WORK_ITEM_PURPOSE))
    .all();
}

function scribeWorkItemCount(): number {
  return scribeWorkItems().length;
}

function resetTables(): void {
  const db = getDb();
  db.delete(claudeAgentRuns).run();
  db.delete(workItems).run();
  db.delete(feedEntries).run();
  db.delete(researchProjects).run();
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
