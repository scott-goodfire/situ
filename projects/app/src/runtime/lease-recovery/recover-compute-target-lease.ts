import type { ComputeTargetRecord } from "@situ/compute";

import type { WorkItem } from "../../data/db/schema";
import { researchTaskRepository } from "../../data/repositories/research-tasks";
import { applyComputeLeaseRecoveryAction } from "./apply-compute-lease-recovery-action";
import { computeLeaseRecoveryAction } from "./compute-lease-recovery-action";
import { hasOpenWorkItemForComputeTarget } from "./open-work-item-for-compute-target";

export async function recoverComputeTargetLease({
  target,
  openWorkItems,
  now,
}: {
  target: ComputeTargetRecord;
  openWorkItems: WorkItem[];
  now: string;
}): Promise<ComputeTargetRecord | undefined> {
  const researchTaskId = target.claimedByResearchTaskId ?? undefined;
  const researchTask = researchTaskId
    ? await researchTaskRepository.get({ researchTaskId })
    : undefined;
  const hasOpenWorkItem = researchTaskId
    ? hasOpenWorkItemForComputeTarget({
        openWorkItems,
        targetId: target.id,
        researchTaskId,
      })
    : false;
  return applyComputeLeaseRecoveryAction({
    target,
    action: computeLeaseRecoveryAction({
      target,
      researchTask,
      hasOpenWorkItem,
      now,
    }),
  });
}
