import { reconcileClaudeManagedSession } from "../../claude/agents/runs";
import { maxScientistConcurrency, maxVerifierConcurrency } from "../../config/runtime";
import { computeModule } from "@situ/compute";
import { workItemModule } from "@situ/work-items";
import { recoverOrphanComputeLeases } from "../lease-recovery";
import {
  dispatchActiveResearchProject,
  dispatchAwaitingResearchTaskVerification,
  dispatchPlannedResearchTask,
} from "../dispatch";
import {
  handleClaimedWorkItem,
  CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE,
  CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
  CLAUDE_SCRIBE_SESSION_WORK_ITEM_PURPOSE,
  CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE,
  workItemLeaseMs,
  workItemMaxAttempts,
} from "../work-items";
import { createScheduler } from "./scheduler";
import { dispatchScribeNarrationIfDue } from "./scribe-dispatch";
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
        await computeModule.ensureDefaultLocalTargets({ desiredCount: maxScientistConcurrency() });
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
      name: "manager-work-item-dispatcher",
      intervalMs: 1_000,
      run: async () => {
        const workItem = await workItemModule.claimDue({
          leaseMs: workItemLeaseMs,
          purpose: CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE,
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
        const workItem = await workItemModule.claimDue({
          leaseMs: workItemLeaseMs,
          purpose: CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
        });
        if (workItem) {
          await handleClaimedWorkItem({ workItem });
        }
      },
    },
    {
      name: "verifier-work-item-dispatcher",
      intervalMs: 1_000,
      concurrency: maxVerifierConcurrency(),
      run: async () => {
        const workItem = await workItemModule.claimDue({
          leaseMs: workItemLeaseMs,
          purpose: CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE,
        });
        if (workItem) {
          await handleClaimedWorkItem({ workItem });
        }
      },
    },
    {
      name: "scribe-narration-tick",
      intervalMs: 10_000,
      run: async () => {
        await dispatchScribeNarrationIfDue();
      },
    },
    {
      name: "scribe-work-item-dispatcher",
      intervalMs: 1_000,
      run: async () => {
        const workItem = await workItemModule.claimDue({
          leaseMs: workItemLeaseMs,
          purpose: CLAUDE_SCRIBE_SESSION_WORK_ITEM_PURPOSE,
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
        const failed = await workItemModule.recoverExpiredLeases({
          maxAttempts: workItemMaxAttempts,
          limit: 20,
        });
        for (const workItem of failed) {
          await computeModule.releaseForWorkItem({
            workItem,
            reason: "work_item_lease_expired",
          });
        }
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
  const activeCount = await workItemModule.countClaimed({
    purpose: CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
  });
  const liveCount = await computeModule.liveTargetCount();
  const concurrencyLimit =
    liveCount === 0 ? maxScientistConcurrency() : Math.min(maxScientistConcurrency(), liveCount);
  return activeCount < concurrencyLimit;
}
