import { asc, eq } from "drizzle-orm";

import {
  computeModule,
  computeTargets,
  type ComputeBlocker,
  type ComputeBlockerResearchTaskRow,
  type ComputeBlockerTargetRow,
} from "@situ/compute";

import { getDb } from "../data/db/client";
import { researchTasks } from "../data/db/schema";

/**
 * Compute-blockers reader. Joins research_tasks (app schema) with
 * compute_targets (@situ/compute schema), then defers to the package's pure
 * blocker analyzer.
 */
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
  return computeModule.blockersForPlannedResearchTasks({
    researchTasks: plannedTasks satisfies readonly ComputeBlockerResearchTaskRow[],
    computeTargets: targets satisfies readonly ComputeBlockerTargetRow[],
  });
}
