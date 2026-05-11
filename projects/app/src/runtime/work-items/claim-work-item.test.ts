import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";

import { ensureRuntimeContext } from "../../config/session-context";
import { getDb } from "../../data/db/client";
import { workItems } from "../../data/db/schema";
import {
  CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE,
  CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
} from "./types";
import { claimDueWorkItem, countClaimedWorkItems } from "./claim-work-item";

const originalEnv = {
  SITU_DB_PATH: process.env.SITU_DB_PATH,
  SITU_HOME: process.env.SITU_HOME,
  SITU_REPO_PATH: process.env.SITU_REPO_PATH,
};

let tempRoot: string;

describe("claimDueWorkItem", () => {
  beforeAll(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "situ-work-item-claim-"));
    const repoPath = join(tempRoot, "repo");
    const sessionHome = join(tempRoot, "state", "sessions", "ses_work_item_claim");
    await mkdir(repoPath, { recursive: true });
    await mkdir(sessionHome, { recursive: true });
    process.env.SITU_HOME = join(tempRoot, "state");
    process.env.SITU_REPO_PATH = repoPath;
    process.env.SITU_DB_PATH = join(sessionHome, "session.sqlite");
    await ensureRuntimeContext({ sessionId: "ses_work_item_claim" });
  });

  beforeEach(() => {
    getDb().delete(workItems).run();
  });

  afterAll(async () => {
    restoreEnv();
    await rm(tempRoot, { recursive: true, force: true });
  });

  test("can claim only Scientist work", async () => {
    insertPendingWorkItems();

    const claimed = await claimDueWorkItem({
      leaseMs: 1_000,
      purpose: CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
    });

    expect(claimed?.id).toBe("work_item_scientist");
  });

  test("can skip Scientist work", async () => {
    insertPendingWorkItems();

    const claimed = await claimDueWorkItem({
      leaseMs: 1_000,
      excludePurpose: CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
    });

    expect(claimed?.id).toBe("work_item_manager");
  });

  test("counts claimed work for one purpose", async () => {
    insertPendingWorkItems();
    await claimDueWorkItem({
      leaseMs: 1_000,
      purpose: CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
    });

    await expect(
      countClaimedWorkItems({
        purpose: CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
      }),
    ).resolves.toBe(1);
    await expect(
      countClaimedWorkItems({
        purpose: CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE,
      }),
    ).resolves.toBe(0);
  });
});

function insertPendingWorkItems(): void {
  getDb()
    .insert(workItems)
    .values([
      workItemValues({
        id: "work_item_scientist",
        purpose: CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
      }),
      workItemValues({
        id: "work_item_manager",
        purpose: CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE,
      }),
    ])
    .run();
}

function workItemValues({
  id,
  purpose,
}: {
  id: string;
  purpose: string;
}): typeof workItems.$inferInsert {
  return {
    id,
    purpose,
    targetKind: "claim-test",
    targetId: id,
    status: "pending",
    availableAt: "2000-01-01T00:00:00.000Z",
  };
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
