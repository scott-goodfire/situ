import { and, asc, count, eq, inArray } from "drizzle-orm";

import {
  enqueueClaudeAgentWork,
  managerResearchProjectPrompt,
  scientistResearchTaskPrompt,
  verifierResearchTaskPrompt,
  type VerifierLineageAncestor,
} from "../../claude/agents/runs";
import { maxScientistConcurrency, maxVerifierConcurrency } from "../../config/runtime";
import { getDb } from "../../data/db/client";
import {
  appEvents,
  researchProjectInteractions,
  researchProjects,
  researchTaskVerifications,
  researchTasks,
  workItems,
} from "../../data/db/schema";
import { recordAppEvent } from "../../app-events";
import { experimentRepository } from "@situ/research-records";
import { researchProjectRepository } from "../../data/repositories/research-projects";
import { researchTaskRepository } from "../../data/repositories/research-tasks";
import { jsonModule } from "../../modules/json";
import { logModule } from "../../modules/log";
import { obs } from "../../observability";
import { hasAnthropicKey } from "../../secrets/local-secret-store";
import { computeModule } from "@situ/compute";
import {
  CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE,
  CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
  CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE,
} from "../work-items";

type ResearchTaskWorkItemPurpose =
  | typeof CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE
  | typeof CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE;
type ResearchTaskRecord = typeof researchTasks.$inferSelect;
export type ScientistResearchTaskEnqueueSkipReason =
  | "task_not_planned"
  | "verifier_owned_task"
  | "project_phase_not_search"
  | "work_already_open"
  | "compute_pool_missing"
  | "compute_pool_busy";
export type ScientistResearchTaskEnqueueResult =
  | {
      status: "enqueued";
      workItemId: string;
      claudeAgentRunId: string;
    }
  | {
      status: "skipped";
      reason: ScientistResearchTaskEnqueueSkipReason;
      researchTaskId: string;
      compute?: {
        pool: string;
        poolKnown: boolean;
      };
    };

export async function dispatchActiveResearchProject(): Promise<void> {
  if (!(await hasAnthropicKey())) {
    return;
  }
  const project = await getDb().query.researchProjects.findFirst({
    where: eq(researchProjects.status, "active"),
    orderBy: [asc(researchProjects.createdAt), asc(researchProjects.id)],
  });
  if (!project) {
    return;
  }
  const cap = maxScientistConcurrency();
  const openCount = await countOpenResearchTasks({ researchProjectId: project.id });
  if (openCount >= cap) {
    return;
  }
  await enqueueManagerResearchProjectWork({
    researchProjectId: project.id,
    plannedTaskBudget: cap - openCount,
  });
}

export async function enqueueManagerResearchProjectWork({
  researchProjectId,
  plannedTaskBudget,
  ignorePlannedResearchTasks = false,
}: {
  researchProjectId: string;
  plannedTaskBudget?: number;
  ignorePlannedResearchTasks?: boolean;
}): Promise<{ workItemId: string; claudeAgentRunId: string } | undefined> {
  const db = getDb();
  const project = await researchProjectRepository.require({ researchProjectId });
  if (project.status !== "active") {
    return undefined;
  }
  const cap = maxScientistConcurrency();
  const openCount = await countOpenResearchTasks({
    researchProjectId: project.id,
    ignorePlannedResearchTasks,
  });
  if (openCount >= cap) {
    return undefined;
  }
  const budget = plannedTaskBudget ?? cap - openCount;
  if (budget <= 0) {
    return undefined;
  }

  const openWork = await db.query.workItems.findFirst({
    where: and(
      eq(workItems.purpose, CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE),
      eq(workItems.targetKind, "researchProject"),
      eq(workItems.targetId, project.id),
      inArray(workItems.status, ["pending", "claimed"]),
    ),
  });
  if (openWork) {
    return undefined;
  }

  const interactions = await db
    .select()
    .from(researchProjectInteractions)
    .where(eq(researchProjectInteractions.researchProjectId, project.id))
    .orderBy(asc(researchProjectInteractions.createdAt), asc(researchProjectInteractions.id));
  const projectTasks = await researchTaskRepository.listByResearchProject({
    researchProjectId: project.id,
    limit: 100,
  });
  const taskIds = projectTasks.map((task) => task.id);
  const verifications = taskIds.length
    ? await db
        .select()
        .from(researchTaskVerifications)
        .where(inArray(researchTaskVerifications.researchTaskId, taskIds))
        .orderBy(asc(researchTaskVerifications.createdAt), asc(researchTaskVerifications.id))
    : [];

  return enqueueClaudeAgentWork({
    purpose: CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE,
    targetKind: "researchProject",
    targetId: project.id,
    content: managerResearchProjectPrompt({
      researchProject: project,
      interactions,
      researchTasks: projectTasks,
      verifications,
      plannedTaskBudget: budget,
    }),
    payload: {
      researchProjectId: project.id,
      researchProjectPhase: project.phase,
      plannedTaskBudget: budget,
    },
  });
}

async function countOpenResearchTasks({
  researchProjectId,
  ignorePlannedResearchTasks = false,
}: {
  researchProjectId: string;
  ignorePlannedResearchTasks?: boolean;
}): Promise<number> {
  const openStatuses: ResearchTaskRecord["status"][] = ignorePlannedResearchTasks
    ? ["running", "awaiting_verification"]
    : ["planned", "running", "awaiting_verification"];
  const [row] = await getDb()
    .select({ value: count() })
    .from(researchTasks)
    .where(
      and(
        eq(researchTasks.researchProjectId, researchProjectId),
        inArray(researchTasks.status, openStatuses),
      ),
    );
  return row?.value ?? 0;
}

export async function dispatchPlannedResearchTask(): Promise<void> {
  if (!(await hasAnthropicKey())) {
    return;
  }
  const plannedTasks = await getDb()
    .select()
    .from(researchTasks)
    .where(eq(researchTasks.status, "planned"))
    .orderBy(asc(researchTasks.createdAt), asc(researchTasks.id));
  if (!plannedTasks.length) {
    return;
  }

  const blockedProjectIds = new Set<string>();
  let scientistBudget = maxScientistConcurrency();
  for (const task of plannedTasks) {
    if (await isBlockedByProjectPhase({ task })) {
      blockedProjectIds.add(task.researchProjectId);
      await recordNonComputeSkippedEnqueue({
        result: {
          status: "skipped",
          reason: "project_phase_not_search",
          researchTaskId: task.id,
        },
      });
      continue;
    }
    if (task.type === "verify") {
      await enqueueVerifierResearchTaskWork({ researchTaskId: task.id });
      continue;
    }
    if (scientistBudget <= 0) {
      continue;
    }
    const result = await enqueueScientistResearchTaskWork({ researchTaskId: task.id });
    if (result.status === "enqueued") {
      scientistBudget -= 1;
      continue;
    }
    if (scientistEnqueueWasComputeBlocked(result)) {
      await recordComputeBlockedEnqueue({ result });
      continue;
    }
    // Non-compute skip (task_not_planned race, work_already_open, etc.) — keep
    // trying other planned tasks rather than halting the tick.
  }

  for (const researchProjectId of blockedProjectIds) {
    await enqueueManagerResearchProjectWork({
      researchProjectId,
      ignorePlannedResearchTasks: true,
    });
  }
}

export async function enqueueScientistResearchTaskWork({
  researchTaskId,
}: {
  researchTaskId: string;
}): Promise<ScientistResearchTaskEnqueueResult> {
  const task = await researchTaskRepository.require({ researchTaskId });
  if (task.status !== "planned") {
    return skippedScientistEnqueue({ task, reason: "task_not_planned" });
  }
  if (task.type === "verify") {
    return skippedScientistEnqueue({ task, reason: "verifier_owned_task" });
  }
  if (await isBlockedByProjectPhase({ task })) {
    return skippedScientistEnqueue({ task, reason: "project_phase_not_search" });
  }
  if (
    await hasOpenResearchTaskAgentWork({
      purpose: CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
      researchTaskId: task.id,
    })
  ) {
    return skippedScientistEnqueue({ task, reason: "work_already_open" });
  }
  const computeClaim = await computeModule.claimForResearchTask({ researchTask: task });
  if (computeClaim.required && !computeClaim.target) {
    return skippedScientistEnqueue({
      task,
      reason: computeClaim.poolKnown ? "compute_pool_busy" : "compute_pool_missing",
      compute: computeClaim.pool
        ? {
            pool: computeClaim.pool,
            poolKnown: computeClaim.poolKnown,
          }
        : undefined,
    });
  }
  const claimedTask = await researchTaskRepository.claimPlanned({ researchTaskId: task.id });
  const enqueued = await enqueueClaudeAgentWork({
    purpose: CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
    targetKind: "researchTask",
    targetId: claimedTask.id,
    content: scientistResearchTaskPrompt({ researchTask: claimedTask }),
    payload: {
      activeResearchTaskId: claimedTask.id,
      researchProjectId: claimedTask.researchProjectId,
      computeTargetId: computeClaim.target?.id,
    },
  });
  return { status: "enqueued", ...enqueued };
}

async function skippedScientistEnqueue({
  task,
  reason,
  compute,
}: {
  task: ResearchTaskRecord;
  reason: ScientistResearchTaskEnqueueSkipReason;
  compute?: { pool: string; poolKnown: boolean };
}): Promise<ScientistResearchTaskEnqueueResult> {
  const result: ScientistResearchTaskEnqueueResult = {
    status: "skipped",
    reason,
    researchTaskId: task.id,
    compute,
  };
  if (isNonComputeSkipReason(reason)) {
    await recordNonComputeSkippedEnqueue({ result });
  }
  return result;
}

function isNonComputeSkipReason(reason: ScientistResearchTaskEnqueueSkipReason): boolean {
  return reason !== "compute_pool_missing" && reason !== "compute_pool_busy";
}

async function recordNonComputeSkippedEnqueue({
  result,
}: {
  result: Extract<ScientistResearchTaskEnqueueResult, { status: "skipped" }>;
}): Promise<void> {
  if (await nonComputeSkippedEventExists({ result })) {
    return;
  }
  logModule.warn(obs.log.researchTask.enqueueSkipped, {
    researchTaskId: result.researchTaskId,
    reason: result.reason,
  });
  await recordAppEvent({
    type: "research_task.enqueue_skipped",
    message: nonComputeSkippedMessage({ result }),
    payload: {
      researchTaskId: result.researchTaskId,
      reason: result.reason,
    },
  });
}

async function nonComputeSkippedEventExists({
  result,
}: {
  result: Extract<ScientistResearchTaskEnqueueResult, { status: "skipped" }>;
}): Promise<boolean> {
  const events = await getDb()
    .select({ payloadJson: appEvents.payloadJson })
    .from(appEvents)
    .where(eq(appEvents.type, "research_task.enqueue_skipped"));
  return events.some((event) => {
    const payload = jsonModule.parseRecord({ raw: event.payloadJson });
    return payload.researchTaskId === result.researchTaskId && payload.reason === result.reason;
  });
}

function nonComputeSkippedMessage({
  result,
}: {
  result: Extract<ScientistResearchTaskEnqueueResult, { status: "skipped" }>;
}): string {
  const id = result.researchTaskId;
  switch (result.reason) {
    case "task_not_planned":
      return `ResearchTask ${id} is not in planned status; skipping Scientist enqueue.`;
    case "verifier_owned_task":
      return `ResearchTask ${id} is a verify task; Scientist enqueue is not applicable.`;
    case "project_phase_not_search":
      return `ResearchTask ${id} cannot enqueue work until its project baseline is confirmed and phase is search.`;
    case "work_already_open":
      return `ResearchTask ${id} already has open Scientist work; skipping new enqueue.`;
    case "compute_pool_missing":
    case "compute_pool_busy":
      return `ResearchTask ${id} skipped Scientist enqueue: ${result.reason}.`;
  }
}

function scientistEnqueueWasComputeBlocked(
  result: ScientistResearchTaskEnqueueResult,
): result is Extract<ScientistResearchTaskEnqueueResult, { status: "skipped" }> {
  return (
    result.status === "skipped" &&
    (result.reason === "compute_pool_missing" || result.reason === "compute_pool_busy")
  );
}

async function recordComputeBlockedEnqueue({
  result,
}: {
  result: Extract<ScientistResearchTaskEnqueueResult, { status: "skipped" }>;
}): Promise<void> {
  const pool = result.compute?.pool;
  if (!pool || (await computeBlockedEventExists({ result, pool }))) {
    return;
  }
  const message =
    result.reason === "compute_pool_missing"
      ? `ResearchTask ${result.researchTaskId} requires compute pool "${pool}", but no active target is registered.`
      : `ResearchTask ${result.researchTaskId} is waiting for an idle compute target in pool "${pool}".`;
  logModule.warn(obs.log.researchTask.computeBlocked, {
    researchTaskId: result.researchTaskId,
    pool,
    reason: result.reason,
  });
  await recordAppEvent({
    type: "research_task.compute_blocked",
    message,
    payload: {
      researchTaskId: result.researchTaskId,
      pool,
      reason: result.reason,
      poolKnown: result.compute?.poolKnown ?? false,
    },
  });
}

async function computeBlockedEventExists({
  result,
  pool,
}: {
  result: Extract<ScientistResearchTaskEnqueueResult, { status: "skipped" }>;
  pool: string;
}): Promise<boolean> {
  const events = await getDb()
    .select({ payloadJson: appEvents.payloadJson })
    .from(appEvents)
    .where(eq(appEvents.type, "research_task.compute_blocked"));
  return events.some((event) => {
    const payload = jsonModule.parseRecord({ raw: event.payloadJson });
    return (
      payload.researchTaskId === result.researchTaskId &&
      payload.pool === pool &&
      payload.reason === result.reason
    );
  });
}

async function isBlockedByProjectPhase({ task }: { task: ResearchTaskRecord }): Promise<boolean> {
  const project = await researchProjectRepository.require({
    researchProjectId: task.researchProjectId,
  });
  return project.phase !== "search";
}

export async function dispatchAwaitingResearchTaskVerification(): Promise<void> {
  if (!(await hasAnthropicKey())) {
    return;
  }
  const limit = maxVerifierConcurrency();
  const tasks = await getDb()
    .select()
    .from(researchTasks)
    .where(eq(researchTasks.status, "awaiting_verification"))
    .orderBy(asc(researchTasks.updatedAt), asc(researchTasks.id))
    .limit(limit);
  for (const task of tasks) {
    await enqueueVerifierResearchTaskWork({ researchTaskId: task.id });
  }
}

export async function enqueueVerifierResearchTaskWork({
  researchTaskId,
}: {
  researchTaskId: string;
}): Promise<{ workItemId: string; claudeAgentRunId: string } | undefined> {
  const task = await researchTaskRepository.require({ researchTaskId });
  if (!isVerifierRoutableTask({ task })) {
    return undefined;
  }
  if (
    await hasOpenResearchTaskAgentWork({
      purpose: CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE,
      researchTaskId: task.id,
    })
  ) {
    return undefined;
  }
  const verifierTask =
    task.status === "planned"
      ? await preparePlannedVerifyTaskForVerifier({ researchTaskId: task.id })
      : task;
  const lineage = await loadVerifierLineage({ researchTaskId: verifierTask.id });
  return enqueueClaudeAgentWork({
    purpose: CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE,
    targetKind: "researchTask",
    targetId: verifierTask.id,
    content: verifierResearchTaskPrompt({ researchTask: verifierTask, lineage }),
    payload: {
      activeResearchTaskId: verifierTask.id,
      researchProjectId: verifierTask.researchProjectId,
    },
  });
}

const VERIFIER_LINEAGE_MAX_DEPTH = 10;

async function loadVerifierLineage({
  researchTaskId,
}: {
  researchTaskId: string;
}): Promise<VerifierLineageAncestor[]> {
  const candidateExperiments = await experimentRepository.listByResearchTask({ researchTaskId });
  const childExperiment = candidateExperiments[0];
  if (!childExperiment?.parentExperimentId) {
    return [];
  }
  const ancestors: VerifierLineageAncestor[] = [];
  let cursorId: string | null = childExperiment.parentExperimentId;
  const visited = new Set<string>([childExperiment.id]);
  while (cursorId && ancestors.length < VERIFIER_LINEAGE_MAX_DEPTH) {
    if (visited.has(cursorId)) {
      break;
    }
    visited.add(cursorId);
    const ancestor = await experimentRepository.get({ experimentId: cursorId });
    if (!ancestor) {
      break;
    }
    ancestors.push({
      experimentId: ancestor.id,
      title: ancestor.title,
      status: ancestor.status,
      candidateCommit: ancestor.candidateCommit,
    });
    cursorId = ancestor.parentExperimentId;
  }
  return ancestors;
}

async function hasOpenResearchTaskAgentWork({
  purpose,
  researchTaskId,
}: {
  purpose: ResearchTaskWorkItemPurpose;
  researchTaskId: string;
}): Promise<boolean> {
  const openWork = await getDb().query.workItems.findFirst({
    where: and(
      eq(workItems.purpose, purpose),
      eq(workItems.targetKind, "researchTask"),
      eq(workItems.targetId, researchTaskId),
      inArray(workItems.status, ["pending", "claimed"]),
    ),
  });
  return openWork !== undefined;
}

function isVerifierRoutableTask({
  task,
}: {
  task: Awaited<ReturnType<typeof researchTaskRepository.require>>;
}): boolean {
  return (
    task.status === "awaiting_verification" || (task.status === "planned" && task.type === "verify")
  );
}

async function preparePlannedVerifyTaskForVerifier({
  researchTaskId,
}: {
  researchTaskId: string;
}): Promise<Awaited<ReturnType<typeof researchTaskRepository.require>>> {
  await researchTaskRepository.claimPlanned({ researchTaskId });
  return researchTaskRepository.transition({
    researchTaskId,
    status: "awaiting_verification",
    resultSummary:
      "Verifier-owned ResearchTask. Treat workerPrompt as the verification assignment and verificationPrompt as acceptance criteria.",
  });
}
