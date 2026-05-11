import { and, asc, eq, inArray } from "drizzle-orm";

import {
  enqueueClaudeAgentWork,
  managerResearchProjectPrompt,
  scientistResearchTaskPrompt,
  verifierResearchTaskPrompt,
} from "../../claude/agents/runs";
import { getDb } from "../../data/db/client";
import {
  appEvents,
  baselines,
  researchProjectInteractions,
  researchProjects,
  researchTaskVerifications,
  researchTasks,
  workItems,
} from "../../data/db/schema";
import { recordAppEvent } from "../../app-events";
import { researchProjectRepository } from "../../data/repositories/research-projects";
import { researchTaskRepository } from "../../data/repositories/research-tasks";
import { jsonModule } from "../../modules/json";
import { logModule } from "../../modules/log";
import { obs } from "../../observability";
import { hasAnthropicKey } from "../../secrets/local-secret-store";
import { claimComputeForResearchTask } from "../compute";
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
  | "missing_verified_baseline"
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
  if (await hasOpenResearchTaskWork({ researchProjectId: project.id })) {
    return;
  }
  await enqueueManagerResearchProjectWork({ researchProjectId: project.id });
}

export async function enqueueManagerResearchProjectWork({
  researchProjectId,
  ignorePlannedResearchTasks = false,
}: {
  researchProjectId: string;
  ignorePlannedResearchTasks?: boolean;
}): Promise<{ workItemId: string; claudeAgentRunId: string } | undefined> {
  const db = getDb();
  const project = await researchProjectRepository.require({ researchProjectId });
  if (project.status !== "active") {
    return undefined;
  }
  if (
    await hasOpenResearchTaskWork({ researchProjectId: project.id, ignorePlannedResearchTasks })
  ) {
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
    }),
    payload: {
      researchProjectId: project.id,
      researchProjectPhase: project.phase,
    },
  });
}

async function hasOpenResearchTaskWork({
  researchProjectId,
  ignorePlannedResearchTasks = false,
}: {
  researchProjectId: string;
  ignorePlannedResearchTasks?: boolean;
}): Promise<boolean> {
  const openStatuses: ResearchTaskRecord["status"][] = ignorePlannedResearchTasks
    ? ["running", "awaiting_verification"]
    : ["planned", "running", "awaiting_verification"];
  const openTask = await getDb().query.researchTasks.findFirst({
    where: and(
      eq(researchTasks.researchProjectId, researchProjectId),
      inArray(researchTasks.status, openStatuses),
    ),
  });
  return openTask !== undefined;
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
  for (const task of plannedTasks) {
    if (await isBlockedByMissingVerifiedBaseline({ task })) {
      blockedProjectIds.add(task.researchProjectId);
      continue;
    }
    if (task.type === "verify") {
      await enqueueVerifierResearchTaskWork({ researchTaskId: task.id });
      return;
    }
    const result = await enqueueScientistResearchTaskWork({ researchTaskId: task.id });
    if (result.status === "enqueued") {
      return;
    }
    if (scientistEnqueueWasComputeBlocked(result)) {
      await recordComputeBlockedEnqueue({ result });
      continue;
    }
    return;
  }

  for (const researchProjectId of blockedProjectIds) {
    const enqueued = await enqueueManagerResearchProjectWork({
      researchProjectId,
      ignorePlannedResearchTasks: true,
    });
    if (enqueued) {
      return;
    }
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
  if (await isBlockedByMissingVerifiedBaseline({ task })) {
    return skippedScientistEnqueue({ task, reason: "missing_verified_baseline" });
  }
  if (
    await hasOpenResearchTaskAgentWork({
      purpose: CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
      researchTaskId: task.id,
    })
  ) {
    return skippedScientistEnqueue({ task, reason: "work_already_open" });
  }
  const computeClaim = await claimComputeForResearchTask({ researchTask: task });
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

function skippedScientistEnqueue({
  task,
  reason,
  compute,
}: {
  task: ResearchTaskRecord;
  reason: ScientistResearchTaskEnqueueSkipReason;
  compute?: { pool: string; poolKnown: boolean };
}): ScientistResearchTaskEnqueueResult {
  return {
    status: "skipped",
    reason,
    researchTaskId: task.id,
    compute,
  };
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

async function isBlockedByMissingVerifiedBaseline({
  task,
}: {
  task: ResearchTaskRecord;
}): Promise<boolean> {
  if (task.type !== "exploit") {
    return false;
  }
  return !(await hasVerifiedBaselineEvidence({ researchProjectId: task.researchProjectId }));
}

async function hasVerifiedBaselineEvidence({
  researchProjectId,
}: {
  researchProjectId: string;
}): Promise<boolean> {
  const rows = await getDb()
    .select({ baselineId: baselines.id })
    .from(baselines)
    .innerJoin(researchTasks, eq(baselines.createdByResearchTaskId, researchTasks.id))
    .where(
      and(
        eq(researchTasks.researchProjectId, researchProjectId),
        eq(researchTasks.status, "verified"),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function dispatchAwaitingResearchTaskVerification(): Promise<void> {
  if (!(await hasAnthropicKey())) {
    return;
  }
  const task = await getDb().query.researchTasks.findFirst({
    where: eq(researchTasks.status, "awaiting_verification"),
    orderBy: [asc(researchTasks.updatedAt), asc(researchTasks.id)],
  });
  if (!task) {
    return;
  }
  await enqueueVerifierResearchTaskWork({ researchTaskId: task.id });
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
  return enqueueClaudeAgentWork({
    purpose: CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE,
    targetKind: "researchTask",
    targetId: verifierTask.id,
    content: verifierResearchTaskPrompt({ researchTask: verifierTask }),
    payload: {
      activeResearchTaskId: verifierTask.id,
      researchProjectId: verifierTask.researchProjectId,
    },
  });
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
