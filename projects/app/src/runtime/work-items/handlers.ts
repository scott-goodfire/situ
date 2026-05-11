import { executeClaudeAgentTurn } from "../../claude/agents/runs";
import { heartbeatComputeLeaseForWorkItem, releaseComputeForWorkItem } from "../compute";
import { logModule } from "../../modules/log";
import { obs, withSpan } from "../../observability";
import { researchProjectRepository } from "../../data/repositories/research-projects";
import { completeWorkItem } from "./complete-work-item";
import { failOrRetryWorkItem } from "./fail-work-item";
import { extendWorkItemLease } from "./lease";
import {
  CLAUDE_AGENT_TURN_WORK_ITEM_PURPOSE,
  CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE,
  CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
  CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE,
  type WorkItemHandler,
  type WorkItem,
} from "./types";

const MAX_ATTEMPTS = 3;
const LEASE_MS = 10 * 60 * 1000;
const HEARTBEAT_MS = 30 * 1000;

const handlers: Record<string, WorkItemHandler | undefined> = {
  [CLAUDE_AGENT_TURN_WORK_ITEM_PURPOSE]: executeClaudeAgentTurn,
  [CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE]: executeClaudeAgentTurn,
  [CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE]: executeClaudeAgentTurn,
  [CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE]: executeClaudeAgentTurn,
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
    const outcome = await failOrRetryWorkItem({
      workItem,
      maxAttempts: 1,
      error: new Error(`No handler registered for work item purpose: ${workItem.purpose}`),
    });
    if (outcome === "failed") {
      await releaseComputeForWorkItem({ workItem, reason: "work_item_failed" });
    }
    return;
  }

  const heartbeat = setInterval(() => {
    void extendWorkItemLease({ workItem, leaseMs: LEASE_MS }).catch((error) => {
      logModule.warn(obs.log.workItem.leaseExtensionFailed, {
        [obs.attr.workItem.id]: workItem.id,
        error,
      });
    });
    void heartbeatComputeLeaseForWorkItem({ workItem }).catch((error) => {
      logModule.warn(obs.log.workItem.computeHeartbeatFailed, {
        [obs.attr.workItem.id]: workItem.id,
        error,
      });
    });
  }, HEARTBEAT_MS);
  try {
    await heartbeatComputeLeaseForWorkItem({ workItem });
    await handler({ workItem });
    await completeWorkItem({ workItem });
    await releaseComputeForWorkItem({ workItem, reason: "work_item_complete" });
  } catch (error) {
    const outcome = await failOrRetryWorkItem({
      workItem,
      error,
      maxAttempts: MAX_ATTEMPTS,
    });
    if (outcome === "failed") {
      await failResearchProjectForWorkItem({ workItem, error });
      await releaseComputeForWorkItem({ workItem, reason: "work_item_failed" });
    }
  } finally {
    clearInterval(heartbeat);
  }
}

export const workItemLeaseMs = LEASE_MS;
export const workItemMaxAttempts = MAX_ATTEMPTS;

async function failResearchProjectForWorkItem({
  workItem,
  error,
}: {
  workItem: WorkItem;
  error: unknown;
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
    resultSummary: error instanceof Error ? error.message : String(error),
  });
}
