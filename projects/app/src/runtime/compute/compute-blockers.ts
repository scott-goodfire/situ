import { asc, eq } from "drizzle-orm";

import { getDb } from "../../data/db/client";
import { computeTargets, researchTasks } from "../../data/db/schema";
import type { ComputeTargetStatus } from "../../data/repositories/compute-targets";
import type { ResearchTaskType } from "../../data/repositories/research-tasks";
import { computePoolForResearchTask } from "./compute-leases";

export type ComputeBlockerKind = "missing_pool" | "busy_pool";

export type ComputeBlocker = {
  kind: ComputeBlockerKind;
  researchTaskId: string;
  researchTaskTitle: string;
  pool: string;
  totalTargets: number;
  idleTargets: number;
  claimedTargets: number;
  message: string;
};

export type ComputeBlockerResearchTaskRow = {
  id: string;
  type: ResearchTaskType;
  title: string;
  payloadJson: string;
};

export type ComputeBlockerTargetRow = {
  id: string;
  pool: string;
  status: ComputeTargetStatus;
};

export async function readComputeBlockers(): Promise<ComputeBlocker[]> {
  const [plannedTasks, targets] = await Promise.all([
    getDb()
      .select({
        id: researchTasks.id,
        type: researchTasks.type,
        title: researchTasks.title,
        payloadJson: researchTasks.payloadJson,
      })
      .from(researchTasks)
      .where(eq(researchTasks.status, "planned"))
      .orderBy(asc(researchTasks.createdAt), asc(researchTasks.id)),
    getDb()
      .select({
        id: computeTargets.id,
        pool: computeTargets.pool,
        status: computeTargets.status,
      })
      .from(computeTargets)
      .orderBy(asc(computeTargets.pool), asc(computeTargets.id)),
  ]);
  return computeBlockersForPlannedResearchTasks({
    researchTasks: plannedTasks,
    computeTargets: targets,
  });
}

export function computeBlockersForPlannedResearchTasks({
  researchTasks,
  computeTargets,
}: {
  researchTasks: readonly ComputeBlockerResearchTaskRow[];
  computeTargets: readonly ComputeBlockerTargetRow[];
}): ComputeBlocker[] {
  return researchTasks.flatMap((task) => {
    const pool = computePoolForResearchTask({ researchTask: task });
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
