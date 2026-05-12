import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { ensureRuntimeContext } from "../../config/session-context";
import { getDb } from "../../data/db/client";
import {
  appEvents,
  experimentActivities,
  experiments,
  hypotheses,
  hypothesisActivities,
  researchProjects,
  researchTasks,
  type WorkItem,
  workItems,
} from "../../data/db/schema";
import { experimentRepository } from "../../data/repositories/experiments";
import { hypothesisRepository } from "../../data/repositories/hypotheses";
import { researchProjectRepository } from "../../data/repositories/research-projects";
import { researchTaskRepository } from "../../data/repositories/research-tasks";
import { dateTimeModule } from "../../modules/date-time";
import {
  CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
  CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE,
} from "./purposes";
import { finalizeDomainFailureForWorkItem, verifierWorkItemHandler } from "./handlers";

describe("work item domain failure finalization", () => {
  beforeAll(async () => {
    const root = await mkdtemp(join(tmpdir(), "situ-work-item-handlers-"));
    const repoPath = join(root, "repo");
    const sessionHome = join(root, "situ", "sessions", "ses_work_item_handlers");
    await mkdir(repoPath, { recursive: true });
    await mkdir(sessionHome, { recursive: true });
    process.env.SITU_HOME = join(root, "situ");
    process.env.SITU_REPO_PATH = repoPath;
    process.env.SITU_DB_PATH = join(sessionHome, "session.sqlite");
    await ensureRuntimeContext({ sessionId: "ses_work_item_handlers" });
  });

  beforeEach(() => {
    resetTables();
  });

  test("failed Scientist work marks the ResearchTask and active experiments failed", async () => {
    const { task, experiment } = await createTaskWithExperiment();
    await researchTaskRepository.claimPlanned({ researchTaskId: task.id });
    const workItem = workItemRecord({
      purpose: CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
      targetKind: "researchTask",
      targetId: task.id,
    });

    await finalizeDomainFailureForWorkItem({
      workItem,
      error: new Error("Managed Agent session ended with event session.status_terminated."),
    });

    const storedTask = await researchTaskRepository.require({ researchTaskId: task.id });
    expect(storedTask.status).toBe("failed");
    expect(storedTask.resultSummary).toContain("Work item failed after retries");
    expect(storedTask.resultSummary).toContain("session.status_terminated");
    expect((await experimentRepository.require({ experimentId: experiment.id })).status).toBe(
      "failed",
    );
    expect(researchTaskFailureEvents()).toEqual([task.id]);
  });

  test("failed Verifier work marks the awaiting ResearchTask failed", async () => {
    const { task } = await createTaskWithExperiment();
    await researchTaskRepository.claimPlanned({ researchTaskId: task.id });
    await researchTaskRepository.transition({
      researchTaskId: task.id,
      status: "awaiting_verification",
      resultSummary: "Scientist result awaits verification.",
    });
    const workItem = workItemRecord({
      purpose: CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE,
      targetKind: "researchTask",
      targetId: task.id,
    });

    await finalizeDomainFailureForWorkItem({
      workItem,
      error: new Error("Verifier session failed."),
    });

    const storedTask = await researchTaskRepository.require({ researchTaskId: task.id });
    expect(storedTask.status).toBe("failed");
    expect(storedTask.resultSummary).toContain("Verifier session failed");
  });

  test("verifierWorkItemHandler skips when ResearchTask is already verified", async () => {
    const { task } = await createTaskWithExperiment();
    await researchTaskRepository.claimPlanned({ researchTaskId: task.id });
    await researchTaskRepository.transition({
      researchTaskId: task.id,
      status: "awaiting_verification",
      resultSummary: "Scientist result awaits verification.",
    });
    await researchTaskRepository.transition({
      researchTaskId: task.id,
      status: "verified",
      resultSummary: "Verified by a prior Verifier run.",
    });
    const workItem = workItemRecord({
      purpose: CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE,
      targetKind: "researchTask",
      targetId: task.id,
    });

    await verifierWorkItemHandler({ workItem });

    const storedTask = await researchTaskRepository.require({ researchTaskId: task.id });
    expect(storedTask.status).toBe("verified");
    expect(verifierSkippedEvents()).toEqual([
      { researchTaskId: task.id, researchTaskStatus: "verified" },
    ]);
  });

  test("verifierWorkItemHandler skips when ResearchTask is missing", async () => {
    const workItem = workItemRecord({
      purpose: CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE,
      targetKind: "researchTask",
      targetId: "rtsk_does_not_exist",
    });

    await verifierWorkItemHandler({ workItem });

    expect(verifierSkippedEvents()).toEqual([
      { researchTaskId: "rtsk_does_not_exist", researchTaskStatus: null },
    ]);
  });
});

async function createTaskWithExperiment(): Promise<{
  task: Awaited<ReturnType<typeof researchTaskRepository.create>>;
  experiment: Awaited<ReturnType<typeof experimentRepository.create>>;
}> {
  const project = await researchProjectRepository.create({
    goal: `Handle work item failure ${crypto.randomUUID()}`,
  });
  const hypothesis = await hypothesisRepository.create({
    title: "Failure handling hypothesis",
    summary: "Failure handling should close out partial work.",
  });
  const task = await researchTaskRepository.create({
    researchProjectId: project.id,
    type: "explore",
    title: "Exercise failure handling",
    workerPrompt: "Create an experiment then fail infrastructure.",
    verificationPrompt: "Check failed task cleanup.",
    targetKind: "hypothesis",
    targetId: hypothesis.id,
  });
  const experiment = await experimentRepository.create({
    title: "Partial experiment",
    summary: "This experiment should be failed by infrastructure cleanup.",
    createdByResearchTaskId: task.id,
    associatedHypothesisId: hypothesis.id,
  });
  return { task, experiment };
}

function workItemRecord({
  purpose,
  targetKind,
  targetId,
}: {
  purpose: string;
  targetKind: string;
  targetId: string;
}): WorkItem {
  const now = dateTimeModule.nowIso();
  return {
    id: crypto.randomUUID(),
    purpose,
    targetKind,
    targetId,
    status: "failed",
    ownerAgentId: null,
    ownerWorkflowId: null,
    attempt: 3,
    availableAt: now,
    claimedAt: now,
    leaseExpiresAt: null,
    completedAt: now,
    payloadJson: JSON.stringify({ activeResearchTaskId: targetId }),
    syncVersion: 1,
    syncDeleted: false,
    createdAt: now,
    updatedAt: now,
  };
}

function researchTaskFailureEvents(): string[] {
  return getDb()
    .select()
    .from(appEvents)
    .where(eq(appEvents.type, "research_task.work_item_failed"))
    .all()
    .map((event) => {
      const payload = JSON.parse(event.payloadJson) as { researchTaskId?: string };
      return payload.researchTaskId ?? "";
    });
}

function verifierSkippedEvents(): Array<{
  researchTaskId: string;
  researchTaskStatus: string | null;
}> {
  return getDb()
    .select()
    .from(appEvents)
    .where(eq(appEvents.type, "work_item.verifier_skipped_already_resolved"))
    .all()
    .map((event) => {
      const payload = JSON.parse(event.payloadJson) as {
        researchTaskId?: string;
        researchTaskStatus?: string | null;
      };
      return {
        researchTaskId: payload.researchTaskId ?? "",
        researchTaskStatus: payload.researchTaskStatus ?? null,
      };
    });
}

function resetTables(): void {
  const db = getDb();
  db.delete(appEvents).run();
  db.delete(experimentActivities).run();
  db.delete(experiments).run();
  db.delete(hypothesisActivities).run();
  db.delete(hypotheses).run();
  db.delete(workItems).run();
  db.delete(researchTasks).run();
  db.delete(researchProjects).run();
}
