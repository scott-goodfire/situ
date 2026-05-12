import { computeModule } from "@situ/compute";
import { workItemModule, type WorkItem, type WorkItemHandler } from "@situ/work-items";

import { executeClaudeAgentTurn } from "../../claude/agents/runs";
import { recordAppEvent } from "../../app-events";
import { logModule } from "../../modules/log";
import { obs, withSpan } from "../../observability";
import { experimentRepository } from "../../data/repositories/experiments";
import { researchProjectRepository } from "../../data/repositories/research-projects";
import {
  researchTaskRepository,
  type ResearchTaskRecord,
} from "../../data/repositories/research-tasks";
import {
  CLAUDE_AGENT_TURN_WORK_ITEM_PURPOSE,
  CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE,
  CLAUDE_REPORTER_SESSION_WORK_ITEM_PURPOSE,
  CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
  CLAUDE_SCRIBE_SESSION_WORK_ITEM_PURPOSE,
  CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE,
} from "./purposes";

const MAX_ATTEMPTS = 3;
const LEASE_MS = 10 * 60 * 1000;
const HEARTBEAT_MS = 30 * 1000;

const handlers: Record<string, WorkItemHandler | undefined> = {
  [CLAUDE_AGENT_TURN_WORK_ITEM_PURPOSE]: executeClaudeAgentTurn,
  [CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE]: executeClaudeAgentTurn,
  [CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE]: executeClaudeAgentTurn,
  [CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE]: verifierWorkItemHandler,
  [CLAUDE_SCRIBE_SESSION_WORK_ITEM_PURPOSE]: executeClaudeAgentTurn,
  [CLAUDE_REPORTER_SESSION_WORK_ITEM_PURPOSE]: executeClaudeAgentTurn,
};

export async function handleClaimedWorkItem({ workItem }: { workItem: WorkItem }): Promise<void> {
  await withSpan({
    name: obs.span.workItem.handle,
    attributes: {
      [obs.attr.workItem.id]: workItem.id,
      [obs.attr.workItem.purpose]: workItem.purpose,
      [obs.attr.workItem.targetKind]: workItem.targetKind,
      [obs.attr.workItem.attempt]: workItem.attempt,
    },
    fn: () => handleClaimedWorkItemInner({ workItem }),
  });
}

async function handleClaimedWorkItemInner({ workItem }: { workItem: WorkItem }): Promise<void> {
  const handler = handlers[workItem.purpose];
  if (!handler) {
    const error = new Error(`No handler registered for work item purpose: ${workItem.purpose}`);
    const outcome = await workItemModule.failOrRetry({
      workItem,
      maxAttempts: 1,
      error,
    });
    if (outcome === "failed") {
      await finalizeDomainFailureForWorkItem({ workItem, error });
      await computeModule.releaseForWorkItem({ workItem, reason: "work_item_failed" });
    }
    return;
  }

  const heartbeat = setInterval(() => {
    void workItemModule.extendLease({ workItem, leaseMs: LEASE_MS }).catch((error) => {
      logModule.warn(obs.log.workItem.leaseExtensionFailed, {
        [obs.attr.workItem.id]: workItem.id,
        error,
      });
    });
    void computeModule.heartbeatLeaseForWorkItem({ workItem }).catch((error) => {
      logModule.warn(obs.log.workItem.computeHeartbeatFailed, {
        [obs.attr.workItem.id]: workItem.id,
        error,
      });
    });
  }, HEARTBEAT_MS);
  try {
    await computeModule.heartbeatLeaseForWorkItem({ workItem });
    await handler({ workItem });
    await workItemModule.complete({ workItem });
    await computeModule.releaseForWorkItem({ workItem, reason: "work_item_complete" });
  } catch (error) {
    const outcome = await workItemModule.failOrRetry({
      workItem,
      error,
      maxAttempts: MAX_ATTEMPTS,
    });
    if (outcome === "failed") {
      await finalizeDomainFailureForWorkItem({ workItem, error });
      await computeModule.releaseForWorkItem({ workItem, reason: "work_item_failed" });
    }
  } finally {
    clearInterval(heartbeat);
  }
}

export const workItemLeaseMs = LEASE_MS;
export const workItemMaxAttempts = MAX_ATTEMPTS;

export async function verifierWorkItemHandler({ workItem }: { workItem: WorkItem }): Promise<void> {
  const researchTaskId = workItem.targetId;
  const researchTask = await researchTaskRepository.get({ researchTaskId });
  if (!researchTask || researchTask.status !== "awaiting_verification") {
    await recordAppEvent({
      type: "work_item.verifier_skipped_already_resolved",
      message: `Verifier work item skipped: researchTask ${researchTaskId} status=${researchTask?.status ?? "missing"}`,
      payload: {
        workItemId: workItem.id,
        researchTaskId,
        researchTaskStatus: researchTask?.status ?? null,
      },
    });
    return;
  }
  await executeClaudeAgentTurn({ workItem });
}

export async function finalizeDomainFailureForWorkItem({
  workItem,
  error,
}: {
  workItem: WorkItem;
  error: unknown;
}): Promise<void> {
  const message = errorMessage({ error });
  if (workItem.purpose === CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE) {
    await failResearchProjectForWorkItem({ workItem, message });
    return;
  }
  if (
    workItem.purpose === CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE ||
    workItem.purpose === CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE
  ) {
    await failResearchTaskForWorkItem({ workItem, message });
  }
}

async function failResearchProjectForWorkItem({
  workItem,
  message,
}: {
  workItem: WorkItem;
  message: string;
}): Promise<void> {
  if (
    workItem.purpose !== CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE ||
    workItem.targetKind !== "researchProject"
  ) {
    return;
  }
  const researchProject = await researchProjectRepository.get({
    researchProjectId: workItem.targetId,
  });
  if (!researchProject || ["complete", "failed", "canceled"].includes(researchProject.status)) {
    return;
  }
  await researchProjectRepository.transition({
    researchProjectId: researchProject.id,
    status: "failed",
    resultSummary: message,
  });
}

async function failResearchTaskForWorkItem({
  workItem,
  message,
}: {
  workItem: WorkItem;
  message: string;
}): Promise<void> {
  const researchTaskId = activeResearchTaskIdForWorkItem({ workItem });
  if (!researchTaskId) {
    return;
  }
  const researchTask = await researchTaskRepository.get({ researchTaskId });
  if (!researchTask || researchTaskIsTerminal({ researchTask })) {
    return;
  }
  await failActiveExperimentsForResearchTask({ researchTaskId, message });
  await researchTaskRepository.transition({
    researchTaskId,
    status: "failed",
    resultSummary: `Work item failed after retries: ${message}`,
  });
  await recordAppEvent({
    type: "research_task.work_item_failed",
    message: `ResearchTask failed after work item failure: ${researchTaskId}`,
    payload: {
      researchTaskId,
      workItemId: workItem.id,
      workItemPurpose: workItem.purpose,
      error: message,
    },
  });
}

async function failActiveExperimentsForResearchTask({
  researchTaskId,
  message,
}: {
  researchTaskId: string;
  message: string;
}): Promise<void> {
  const experiments = await experimentRepository.listByResearchTask({ researchTaskId });
  for (const experiment of experiments) {
    if (["done", "canceled", "failed"].includes(experiment.status)) {
      continue;
    }
    await experimentRepository.fail({
      experimentId: experiment.id,
      comment: `Work item failed before the experiment completed: ${message}`,
      actor: "system",
    });
  }
}

function activeResearchTaskIdForWorkItem({ workItem }: { workItem: WorkItem }): string | undefined {
  if (workItem.targetKind === "researchTask") {
    return workItem.targetId;
  }
  return workItemModule.payload({ workItem }).activeResearchTaskId;
}

function researchTaskIsTerminal({ researchTask }: { researchTask: ResearchTaskRecord }): boolean {
  return ["verified", "rejected", "pruned", "failed", "canceled"].includes(researchTask.status);
}

function errorMessage({ error }: { error: unknown }): string {
  return error instanceof Error ? error.message : String(error);
}
