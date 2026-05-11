import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";

import { ensureRuntimeContext, resetRuntimeContextForTests } from "../../../config/session-context";
import { getDb, resetDbForTests } from "../../../data/db/client";
import { feedEntries, researchProjects } from "../../../data/db/schema";
import { feedEntryRepository } from "../../../data/repositories/feed-entries";
import { researchProjectRepository } from "../../../data/repositories/research-projects";
import type { ClaudeAgentToolContext } from "./types";
import { writeFeedEntryTool } from "./write-feed-entry";

const originalEnv = {
  SITU_HOME: process.env.SITU_HOME,
  SITU_REPO_PATH: process.env.SITU_REPO_PATH,
  SITU_DB_PATH: process.env.SITU_DB_PATH,
};

let tempRoot: string;

describe("write_feed_entry tool", () => {
  beforeAll(async () => {
    resetDbForTests();
    resetRuntimeContextForTests();
    tempRoot = await mkdtemp(join(tmpdir(), "situ-write-feed-entry-tool-"));
    const repoPath = join(tempRoot, "repo");
    const sessionHome = join(tempRoot, "situ", "sessions", "ses_write_feed_entry");
    await mkdir(repoPath, { recursive: true });
    await mkdir(sessionHome, { recursive: true });
    process.env.SITU_HOME = join(tempRoot, "situ");
    process.env.SITU_REPO_PATH = repoPath;
    process.env.SITU_DB_PATH = join(sessionHome, "session.sqlite");
    await ensureRuntimeContext({ sessionId: "ses_write_feed_entry" });
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

  test("writes a feed entry and surfaces it through the repository", async () => {
    const project = await researchProjectRepository.create({
      goal: "Exercise the feed writer.",
    });

    const result = await writeFeedEntryTool.handler({
      input: {
        summaryMarkdown: "First narration of the run.",
        severity: "progress",
        citedAppEventIds: ["evt_abc", "evt_def"],
        windowStartedAt: "2026-05-11T00:00:00.000Z",
        windowEndedAt: "2026-05-11T00:05:00.000Z",
        researchProjectId: project.id,
      },
      context: toolContext({ researchProjectId: project.id }),
    });

    const envelope = JSON.parse(result.content) as { ok: boolean; data?: unknown };
    expect(envelope.ok).toBe(true);
    const entries = await feedEntryRepository.list({ researchProjectId: project.id });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.severity).toBe("progress");
    expect(entries[0]?.summaryMarkdown).toBe("First narration of the run.");
    expect(JSON.parse(entries[0]?.citedAppEventIdsJson ?? "[]")).toEqual(["evt_abc", "evt_def"]);
  });

  test("rejects unknown severity values via schema validation", async () => {
    const project = await researchProjectRepository.create({
      goal: "Exercise severity validation.",
    });

    const result = await writeFeedEntryTool.handler({
      input: {
        summaryMarkdown: "Should not be written.",
        severity: "panic",
        windowStartedAt: "2026-05-11T00:00:00.000Z",
        windowEndedAt: "2026-05-11T00:05:00.000Z",
        researchProjectId: project.id,
      },
      context: toolContext({ researchProjectId: project.id }),
    });

    const envelope = JSON.parse(result.content) as { ok: boolean; code?: string };
    expect(envelope.ok).toBe(false);
    expect(envelope.code).toBe("invalid_input");

    const rows = await feedEntryRepository.list({ researchProjectId: project.id });
    expect(rows).toHaveLength(0);
  });

  test("falls back to the active ResearchProject when researchProjectId is omitted", async () => {
    const project = await researchProjectRepository.create({
      goal: "Exercise context fallback.",
    });

    const result = await writeFeedEntryTool.handler({
      input: {
        summaryMarkdown: "Context fallback narration.",
        severity: "info",
        windowStartedAt: "2026-05-11T00:00:00.000Z",
        windowEndedAt: "2026-05-11T00:05:00.000Z",
      },
      context: toolContext({ researchProjectId: project.id }),
    });

    const envelope = JSON.parse(result.content) as { ok: boolean };
    expect(envelope.ok).toBe(true);
    const entries = await feedEntryRepository.list({ researchProjectId: project.id });
    expect(entries).toHaveLength(1);
  });
});

function toolContext({ researchProjectId }: { researchProjectId: string }): ClaudeAgentToolContext {
  const now = "2026-05-11T00:00:00.000Z";
  return {
    claudeAgentRunId: "run_write_feed_entry",
    workItem: {
      id: "work_write_feed_entry",
      purpose: "claude.scribe_session",
      targetKind: "researchProject",
      targetId: researchProjectId,
      status: "claimed",
      ownerAgentId: null,
      ownerWorkflowId: null,
      attempt: 1,
      availableAt: now,
      claimedAt: now,
      leaseExpiresAt: null,
      completedAt: null,
      payloadJson: JSON.stringify({ researchProjectId }),
      syncVersion: 1,
      syncDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
  };
}

function resetTables(): void {
  const db = getDb();
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
