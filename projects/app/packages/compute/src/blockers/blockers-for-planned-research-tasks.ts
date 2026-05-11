import { poolForResearchTask } from "../operations/pool-for-research-task";
import type {
  ComputeBlocker,
  ComputeBlockerKind,
  ComputeBlockerResearchTaskRow,
  ComputeBlockerTargetRow,
} from "../types";

export function blockersForPlannedResearchTasks({
  researchTasks,
  computeTargets,
}: {
  researchTasks: readonly ComputeBlockerResearchTaskRow[];
  computeTargets: readonly ComputeBlockerTargetRow[];
}): ComputeBlocker[] {
  return researchTasks.flatMap((task) => {
    const pool = poolForResearchTask({ researchTask: task });
    if (!pool) {
      return [];
    }

    const activeTargets = computeTargets.filter(
      (target) => target.pool === pool && target.status !== "dead",
    );
    const idleTargets = activeTargets.filter((target) => target.status === "idle").length;
    const claimedTargets = activeTargets.filter((target) => target.status === "claimed").length;
    if (idleTargets > 0) {
      return [];
    }

    const kind: ComputeBlockerKind = activeTargets.length === 0 ? "missing_pool" : "busy_pool";
    return [
      {
        kind,
        researchTaskId: task.id,
        researchTaskTitle: task.title,
        pool,
        totalTargets: activeTargets.length,
        idleTargets,
        claimedTargets,
        message:
          kind === "missing_pool"
            ? `ResearchTask ${task.id} requires compute pool "${pool}", but no active target is registered.`
            : `ResearchTask ${task.id} is waiting for compute pool "${pool}" (${claimedTargets}/${activeTargets.length} targets claimed).`,
      },
    ];
  });
}
