import { reconcileClaudeManagedSession } from "../../claude/agents/runs";
import { maxScientistConcurrency } from "../../config/runtime";
import {
  ensureDefaultLocalComputeTarget,
  explicitComputeTargetConcurrency,
  recoverOrphanComputeLeases,
} from "../compute";
import {
  dispatchActiveResearchProject,
  dispatchAwaitingResearchTaskVerification,
  dispatchPlannedResearchTask,
} from "../dispatch";
import {
  claimDueWorkItem,
  countClaimedWorkItems,
  handleClaimedWorkItem,
  recoverExpiredWorkItemLeases,
  CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
  workItemLeaseMs,
  workItemMaxAttempts,
} from "../work-items";
import { createScheduler } from "./scheduler";
import type { RuntimeScheduler, SchedulerJob } from "./types";

export function createRuntimeScheduler(): RuntimeScheduler {
  return createScheduler({
    jobs: runtimeSchedulerJobs(),
  });
}

function runtimeSchedulerJobs(): SchedulerJob[] {
  return [
    {
      name: "compute-target-bootstrap",
      intervalMs: 10_000,
      run: async () => {
        await ensureDefaultLocalComputeTarget();
      },
    },
    {
      name: "compute-lease-sweeper",
      intervalMs: 5_000,
      run: async () => {
        await recoverOrphanComputeLeases();
      },
    },
    {
      name: "research-project-dispatcher",
      intervalMs: 1_000,
      run: async () => {
        await dispatchActiveResearchProject();
      },
    },
    {
      name: "research-task-dispatcher",
      intervalMs: 1_000,
      run: async () => {
        await dispatchPlannedResearchTask();
      },
    },
    {
      name: "research-task-verifier-dispatcher",
      intervalMs: 1_000,
      run: async () => {
        await dispatchAwaitingResearchTaskVerification();
      },
    },
    {
      name: "work-item-dispatcher",
      intervalMs: 1_000,
      run: async () => {
        const workItem = await claimDueWorkItem({
          leaseMs: workItemLeaseMs,
          excludePurpose: CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
        });
        if (workItem) {
          await handleClaimedWorkItem({ workItem });
        }
      },
    },
    {
      name: "scientist-work-item-dispatcher",
      intervalMs: 1_000,
      concurrency: maxScientistConcurrency(),
      run: async () => {
        if (!(await canClaimScientistWorkItem())) {
          return;
        }
        const workItem = await claimDueWorkItem({
          leaseMs: workItemLeaseMs,
          purpose: CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
        });
        if (workItem) {
          await handleClaimedWorkItem({ workItem });
        }
      },
    },
    {
      name: "work-item-lease-sweeper",
      intervalMs: 5_000,
      run: async () => {
        await recoverExpiredWorkItemLeases({
          maxAttempts: workItemMaxAttempts,
          limit: 20,
        });
      },
    },
    {
      name: "claude-session-supervisor",
      intervalMs: 10_000,
      run: async () => {
        await reconcileClaudeManagedSession();
      },
    },
  ];
}

export async function canClaimScientistWorkItem(): Promise<boolean> {
  const activeCount = await countClaimedWorkItems({
    purpose: CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
  });
  const computeLimit = await explicitComputeTargetConcurrency();
  const concurrencyLimit =
    computeLimit === undefined
      ? maxScientistConcurrency()
      : Math.min(maxScientistConcurrency(), computeLimit);
  return activeCount < concurrencyLimit;
}
