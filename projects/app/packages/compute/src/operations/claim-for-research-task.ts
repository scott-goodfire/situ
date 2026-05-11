import { COMPUTE_LEASE_SECONDS } from "../constants";
import { getComputeContext } from "../context";
import { computeTargetRepository } from "../repository";
import type { ResearchTaskComputeClaim, ResearchTaskLike } from "../types";
import { poolForResearchTask } from "./pool-for-research-task";

export async function claimForResearchTask({
  researchTask,
}: {
  researchTask: ResearchTaskLike;
}): Promise<ResearchTaskComputeClaim> {
  const pool = poolForResearchTask({ researchTask });
  if (!pool) {
    return { target: undefined, pool: undefined, poolKnown: false, required: false };
  }

  const poolKnown = await computeTargetRepository.poolExists({ pool });
  if (!poolKnown) {
    return { target: undefined, pool, poolKnown: false, required: true };
  }

  const target = await computeTargetRepository.claimForPool({
    pool,
    researchTaskId: researchTask.id,
    leaseSeconds: COMPUTE_LEASE_SECONDS,
  });
  if (target) {
    const { recordAppEvent } = getComputeContext();
    await recordAppEvent({
      type: "compute_target.claimed",
      message: `Compute target claimed: ${target.id}`,
      payload: {
        computeTargetId: target.id,
        pool: target.pool,
        researchTaskId: researchTask.id,
      },
    });
  }
  return { target, pool, poolKnown, required: true };
}
