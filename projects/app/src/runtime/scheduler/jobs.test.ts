import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";

import { ensureRuntimeContext } from "../../config/session-context";
import { getDb } from "../../data/db/client";
import { computeTargets, workItems } from "../../data/db/schema";
import { computeTargetRepository } from "../../data/repositories/compute-targets";
import { ensureDefaultLocalComputeTargets } from "../compute";
import { CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE } from "../work-items";
import { canClaimScientistWorkItem } from "./jobs";

const originalEnv = {
  MAX_SITU_SCIENTIST_CONCURRENCY: process.env.MAX_SITU_SCIENTIST_CONCURRENCY,
  SITU_DB_PATH: process.env.SITU_DB_PATH,
  SITU_HOME: process.env.SITU_HOME,
  SITU_REPO_PATH: process.env.SITU_REPO_PATH,
};

let tempRoot: string;

describe("runtime scheduler jobs", () => {
  beforeAll(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "situ-scheduler-jobs-"));
    const repoPath = join(tempRoot, "repo");
    const sessionHome = join(tempRoot, "state", "sessions", "ses_scheduler_jobs");
    await mkdir(repoPath, { recursive: true });
    await mkdir(sessionHome, { recursive: true });
    process.env.SITU_HOME = join(tempRoot, "state");
    process.env.SITU_REPO_PATH = repoPath;
    process.env.SITU_DB_PATH = join(sessionHome, "session.sqlite");
    await ensureRuntimeContext({ sessionId: "ses_scheduler_jobs" });
  });

  beforeEach(() => {
    resetTables();
    setEnv("MAX_SITU_SCIENTIST_CONCURRENCY", originalEnv.MAX_SITU_SCIENTIST_CONCURRENCY);
  });

  afterAll(() => {
    restoreEnv();
  });

  test("falls back to MAX_SITU_SCIENTIST_CONCURRENCY when no compute targets are registered", async () => {
    process.env.MAX_SITU_SCIENTIST_CONCURRENCY = "4";

    insertClaimedScientistWorkItems(3);
    await expect(canClaimScientistWorkItem()).resolves.toBe(true);

    insertClaimedScientistWorkItems(1, { offset: 3 });
    await expect(canClaimScientistWorkItem()).resolves.toBe(false);
  });

  test("caps Scientist claims at the auto-created local pool size", async () => {
    process.env.MAX_SITU_SCIENTIST_CONCURRENCY = "4";
    await ensureDefaultLocalComputeTargets({ desiredCount: 4 });

    insertClaimedScientistWorkItems(3);
    await expect(canClaimScientistWorkItem()).resolves.toBe(true);

    insertClaimedScientistWorkItems(1, { offset: 3 });
    await expect(canClaimScientistWorkItem()).resolves.toBe(false);
  });

  test("caps Scientist claims by live compute target count when lower than config", async () => {
    process.env.MAX_SITU_SCIENTIST_CONCURRENCY = "4";
    await insertGpuComputeTargets(2);

    insertClaimedScientistWorkItems(1);
    await expect(canClaimScientistWorkItem()).resolves.toBe(true);

    insertClaimedScientistWorkItems(1, { offset: 1 });
    await expect(canClaimScientistWorkItem()).resolves.toBe(false);
  });

  test("caps Scientist claims by config when live compute target count is higher", async () => {
    process.env.MAX_SITU_SCIENTIST_CONCURRENCY = "2";
    await insertGpuComputeTargets(3);

    insertClaimedScientistWorkItems(1);
    await expect(canClaimScientistWorkItem()).resolves.toBe(true);

    insertClaimedScientistWorkItems(1, { offset: 1 });
    await expect(canClaimScientistWorkItem()).resolves.toBe(false);
  });
});

async function insertGpuComputeTargets(count: number): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await computeTargetRepository.upsert({
      computeTargetId: `target-gpu-${index}`,
      pool: "gpu",
      kind: "local",
    });
  }
}

function insertClaimedScientistWorkItems(count: number, { offset = 0 } = {}): void {
  if (count === 0) {
    return;
  }
  getDb()
    .insert(workItems)
    .values(
      Array.from({ length: count }, (_, index) => {
        const id = `work_item_scientist_${offset + index}`;
        return {
          id,
          purpose: CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
          targetKind: "research_task",
          targetId: `research_task_${offset + index}`,
          status: "claimed" as const,
          availableAt: "2000-01-01T00:00:00.000Z",
          claimedAt: "2000-01-01T00:00:00.000Z",
          leaseExpiresAt: "2099-01-01T00:00:00.000Z",
        };
      }),
    )
    .run();
}

function resetTables(): void {
  const db = getDb();
  db.delete(workItems).run();
  db.delete(computeTargets).run();
}

function restoreEnv(): void {
  setEnv("MAX_SITU_SCIENTIST_CONCURRENCY", originalEnv.MAX_SITU_SCIENTIST_CONCURRENCY);
  setEnv("SITU_HOME", originalEnv.SITU_HOME);
  setEnv("SITU_REPO_PATH", originalEnv.SITU_REPO_PATH);
  setEnv("SITU_DB_PATH", originalEnv.SITU_DB_PATH);
}

function setEnv(key: keyof typeof originalEnv, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
