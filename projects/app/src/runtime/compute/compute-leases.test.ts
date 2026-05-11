import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { dispatchPlannedResearchTask } from "../dispatch";
import { ensureRuntimeContext } from "../../config/session-context";
import { getDb } from "../../data/db/client";
import {
  appEvents,
  claudeAgentRuns,
  computeTargets,
  researchProjects,
  researchTasks,
  workItems,
  type WorkItem,
} from "../../data/db/schema";
import { computeTargetRepository } from "../../data/repositories/compute-targets";
import { researchProjectRepository } from "../../data/repositories/research-projects";
import {
  researchTaskRepository,
  type ResearchTaskRecord,
} from "../../data/repositories/research-tasks";
import { dateTimeModule } from "../../modules/date-time";
import {
  claimComputeForResearchTask,
  computeEnvForWorkItem,
  ensureDefaultLocalComputeTarget,
  explicitComputeTargetConcurrency,
  recoverOrphanComputeLeases,
  releaseComputeForWorkItem,
} from ".";

describe("compute leases", () => {
  beforeAll(async () => {
    const root = await mkdtemp(join(tmpdir(), "situ-compute-"));
    const repoPath = join(root, "repo");
    const sessionHome = join(root, "situ", "sessions", "ses_compute");
    await mkdir(repoPath, { recursive: true });
    await mkdir(sessionHome, { recursive: true });
    process.env.SITU_HOME = join(root, "situ");
    process.env.SITU_REPO_PATH = repoPath;
    process.env.SITU_DB_PATH = join(sessionHome, "session.sqlite");
    process.env.SITU_ANTHROPIC_KEY = "test-key";
    await ensureRuntimeContext({ sessionId: "ses_compute" });
  });

  beforeEach(() => {
    resetTables();
  });

  test("claims one pool target and release honors the owning ResearchTask", async () => {
    await computeTargetRepository.upsert({
      computeTargetId: "target-gpu-0",
      pool: "gpu",
      kind: "local",
      label: "GPU 0",
      metadata: { cuda_visible_devices: "0" },
    });
    const researchTask = await createResearchTask({
      payload: { compute: { pool: "gpu" } },
    });

    const claim = await claimComputeForResearchTask({ researchTask });

    expect(claim.pool).toBe("gpu");
    expect(claim.poolKnown).toBe(true);
    expect(claim.required).toBe(true);
    expect(claim.target?.id).toBe("target-gpu-0");
    expect(claim.target?.claimedByResearchTaskId).toBe(researchTask.id);

    const wrongOwnerRelease = await computeTargetRepository.release({
      computeTargetId: "target-gpu-0",
      owningResearchTaskId: "research_task_other",
    });
    expect(wrongOwnerRelease.status).toBe("claimed");
    expect(wrongOwnerRelease.claimedByResearchTaskId).toBe(researchTask.id);

    const env = await computeEnvForWorkItem({
      workItem: workItemRecord({
        payload: {
          activeResearchTaskId: researchTask.id,
          computeTargetId: "target-gpu-0",
        },
      }),
    });
    expect(env.SITU_COMPUTE_TARGET_ID).toBe("target-gpu-0");
    expect(env.SITU_COMPUTE_POOL).toBe("gpu");
    expect(env.CUDA_VISIBLE_DEVICES).toBe("0");

    await releaseComputeForWorkItem({
      workItem: workItemRecord({
        payload: {
          activeResearchTaskId: researchTask.id,
          computeTargetId: "target-gpu-0",
        },
      }),
      reason: "test_complete",
    });
    const released = await computeTargetRepository.require({
      computeTargetId: "target-gpu-0",
    });
    expect(released.status).toBe("idle");
    expect(released.claimedByResearchTaskId).toBeNull();
  });

  test("treats malformed work item payloads and target metadata as empty records", async () => {
    await computeTargetRepository.upsert({
      computeTargetId: "target-malformed-metadata",
      pool: "gpu",
      kind: "local",
      label: "Malformed metadata target",
      metadata: { cuda_visible_devices: "0" },
    });
    const researchTask = await createResearchTask({
      payload: { compute: { pool: "gpu" } },
    });
    await computeTargetRepository.claimForPool({
      pool: "gpu",
      researchTaskId: researchTask.id,
    });
    getDb()
      .update(computeTargets)
      .set({ metadataJson: "not json" })
      .where(eq(computeTargets.id, "target-malformed-metadata"))
      .run();

    await expect(
      computeEnvForWorkItem({
        workItem: workItemRecord({
          payload: {
            activeResearchTaskId: researchTask.id,
            computeTargetId: "target-malformed-metadata",
          },
        }),
      }),
    ).resolves.toEqual({
      SITU_COMPUTE_TARGET_ID: "target-malformed-metadata",
      SITU_COMPUTE_POOL: "gpu",
      SITU_COMPUTE_TARGET_LABEL: "Malformed metadata target",
    });

    await expect(
      computeEnvForWorkItem({
        workItem: workItemRecordFromPayloadJson({ payloadJson: "not json" }),
      }),
    ).resolves.toEqual({});
  });

  test("dispatchPlannedResearchTask leases compute and puts the target id on Scientist work", async () => {
    await computeTargetRepository.upsert({
      computeTargetId: "target-local",
      pool: "local",
      kind: "local",
      label: "Local",
    });
    const researchTask = await createResearchTask({
      payload: { compute: { pool: "local" } },
    });

    await dispatchPlannedResearchTask();

    const storedTask = await researchTaskRepository.require({
      researchTaskId: researchTask.id,
    });
    expect(storedTask.status).toBe("running");
    const target = await computeTargetRepository.require({
      computeTargetId: "target-local",
    });
    expect(target.status).toBe("claimed");
    expect(target.claimedByResearchTaskId).toBe(researchTask.id);
    const [workItem] = await getDb().select().from(workItems);
    const payload = JSON.parse(workItem.payloadJson) as {
      activeResearchTaskId?: string;
      computeTargetId?: string;
    };
    expect(payload.activeResearchTaskId).toBe(researchTask.id);
    expect(payload.computeTargetId).toBe("target-local");
  });

  test("recoverOrphanComputeLeases releases targets stuck in claimed status with no claimant", async () => {
    await computeTargetRepository.upsert({
      computeTargetId: "target-orphan",
      pool: "gpu",
      kind: "local",
    });
    getDb()
      .update(computeTargets)
      .set({
        status: "claimed",
        claimedByResearchTaskId: null,
        leaseExpiresAt: dateTimeModule.nowIso(),
      })
      .where(eq(computeTargets.id, "target-orphan"))
      .run();

    const released = await recoverOrphanComputeLeases();

    expect(released.map((target) => target.id)).toContain("target-orphan");
    const target = await computeTargetRepository.require({
      computeTargetId: "target-orphan",
    });
    expect(target.status).toBe("idle");
    expect(target.claimedByResearchTaskId).toBeNull();
    expect(releaseReasons()).toContain("no_claimant");
  });

  test("recoverOrphanComputeLeases releases targets whose owning ResearchTask is terminal", async () => {
    await computeTargetRepository.upsert({
      computeTargetId: "target-terminal",
      pool: "gpu",
      kind: "local",
    });
    const researchTask = await createResearchTask({
      payload: { compute: { pool: "gpu" } },
    });
    await researchTaskRepository.claimPlanned({ researchTaskId: researchTask.id });
    await researchTaskRepository.transition({
      researchTaskId: researchTask.id,
      status: "verified",
    });
    await computeTargetRepository.claimForPool({
      pool: "gpu",
      researchTaskId: researchTask.id,
    });

    const released = await recoverOrphanComputeLeases();

    expect(released.map((target) => target.id)).toContain("target-terminal");
    const target = await computeTargetRepository.require({
      computeTargetId: "target-terminal",
    });
    expect(target.status).toBe("idle");
    expect(target.claimedByResearchTaskId).toBeNull();
    expect(releaseReasons()).toContain("research_task_terminal");
  });

  test("ensureDefaultLocalComputeTarget creates a local target once and returns it on subsequent calls", async () => {
    const first = await ensureDefaultLocalComputeTarget();
    expect(first.pool).toBe("local");
    expect(first.kind).toBe("local");
    expect(first.label).toBe("Local");

    const second = await ensureDefaultLocalComputeTarget();
    expect(second.id).toBe(first.id);

    const all = await getDb().select().from(computeTargets).where(eq(computeTargets.pool, "local"));
    expect(all).toHaveLength(1);
  });

  test("explicitComputeTargetConcurrency ignores the implicit local target", async () => {
    await ensureDefaultLocalComputeTarget();
    await expect(explicitComputeTargetConcurrency()).resolves.toBeUndefined();

    await computeTargetRepository.upsert({
      computeTargetId: "target-explicit-gpu",
      pool: "gpu",
      kind: "local",
    });
    await computeTargetRepository.upsert({
      computeTargetId: "target-dead-gpu",
      pool: "gpu",
      kind: "local",
    });
    await computeTargetRepository.markDead({ computeTargetId: "target-dead-gpu" });

    await expect(explicitComputeTargetConcurrency()).resolves.toBe(1);
  });

  test("recoverOrphanComputeLeases returns expired running ResearchTasks to planned", async () => {
    await computeTargetRepository.upsert({
      computeTargetId: "target-expired",
      pool: "gpu",
      kind: "local",
    });
    const researchTask = await createResearchTask({
      payload: { compute: { pool: "gpu" } },
    });
    await researchTaskRepository.claimPlanned({ researchTaskId: researchTask.id });
    await computeTargetRepository.claimForPool({
      pool: "gpu",
      researchTaskId: researchTask.id,
    });
    getDb()
      .update(computeTargets)
      .set({ leaseExpiresAt: "2000-01-01T00:00:00.000Z" })
      .where(eq(computeTargets.id, "target-expired"))
      .run();

    const released = await recoverOrphanComputeLeases();

    expect(released.map((target) => target.id)).toContain("target-expired");
    const storedTask = await researchTaskRepository.require({
      researchTaskId: researchTask.id,
    });
    expect(storedTask.status).toBe("planned");
    expect(storedTask.resultSummary).toContain("Recovered expired compute lease");
    const target = await computeTargetRepository.require({
      computeTargetId: "target-expired",
    });
    expect(target.status).toBe("idle");
    expect(target.claimedByResearchTaskId).toBeNull();
  });
});

async function createResearchTask({
  title = "Experiment ResearchTask",
  payload = {},
}: {
  title?: string;
  payload?: Record<string, unknown>;
} = {}): Promise<ResearchTaskRecord> {
  const project = await researchProjectRepository.create({
    goal: `Compute test project ${crypto.randomUUID()}`,
  });
  return researchTaskRepository.create({
    researchProjectId: project.id,
    title,
    type: "explore",
    workerPrompt: "Exercise compute lease behavior.",
    verificationPrompt: "Check the compute lease result.",
    payload,
  });
}

function workItemRecord({ payload }: { payload: Record<string, unknown> }): WorkItem {
  return workItemRecordFromPayloadJson({ payloadJson: JSON.stringify(payload) });
}

function workItemRecordFromPayloadJson({ payloadJson }: { payloadJson: string }): WorkItem {
  const now = dateTimeModule.nowIso();
  return {
    id: crypto.randomUUID(),
    purpose: "claude.scientist_research_task",
    targetKind: "claude_agent_run",
    targetId: crypto.randomUUID(),
    status: "claimed",
    ownerAgentId: null,
    ownerWorkflowId: null,
    attempt: 1,
    availableAt: now,
    claimedAt: now,
    leaseExpiresAt: now,
    completedAt: null,
    payloadJson,
    syncVersion: 1,
    syncDeleted: false,
    createdAt: now,
    updatedAt: now,
  };
}

function releaseReasons(): string[] {
  return getDb()
    .select()
    .from(appEvents)
    .where(eq(appEvents.type, "compute_target.released"))
    .all()
    .map((event) => {
      const payload = JSON.parse(event.payloadJson) as { reason?: string };
      return payload.reason ?? "";
    });
}

function resetTables(): void {
  const db = getDb();
  db.delete(appEvents).run();
  db.delete(claudeAgentRuns).run();
  db.delete(workItems).run();
  db.delete(computeTargets).run();
  db.delete(researchTasks).run();
  db.delete(researchProjects).run();
}
