import { recordAppEvent } from "../../app-events";
import { computeTargetRepository } from "../../data/repositories/compute-targets";
import type { ComputeTargetRecord } from "./types";

export async function releaseComputeTarget({
  computeTargetId,
  researchTaskId,
  reason,
}: {
  computeTargetId: string;
  researchTaskId?: string;
  reason: string;
}): Promise<ComputeTargetRecord> {
  const before = await computeTargetRepository.require({ computeTargetId });
  const released = await computeTargetRepository.release({
    computeTargetId,
    owningResearchTaskId: researchTaskId,
  });
  if (
    (before.status === "claimed" || before.status === "draining") &&
    released.claimedByResearchTaskId === null
  ) {
    await recordAppEvent({
      type: "compute_target.released",
      message: `Compute target released: ${computeTargetId}`,
      payload: {
        computeTargetId,
        pool: released.pool,
        researchTaskId: researchTaskId ?? before.claimedByResearchTaskId,
        reason,
      },
    });
  }
  return released;
}
