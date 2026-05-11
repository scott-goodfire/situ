import { computeModule, type ComputeTargetRecord } from "@situ/compute";

import {
  ComputeLeaseRecoveryActionKind,
  type ComputeLeaseRecoveryAction,
} from "./compute-lease-recovery-action";
import { returnResearchTaskToPlannedAfterLeaseRecovery } from "./return-research-task-to-planned-after-lease-recovery";

export async function applyComputeLeaseRecoveryAction({
  target,
  action,
}: {
  target: ComputeTargetRecord;
  action: ComputeLeaseRecoveryAction;
}): Promise<ComputeTargetRecord | undefined> {
  if (action.kind === ComputeLeaseRecoveryActionKind.Keep) {
    return undefined;
  }
  if (action.kind === ComputeLeaseRecoveryActionKind.RecoverResearchTaskAndRelease) {
    await returnResearchTaskToPlannedAfterLeaseRecovery({
      researchTaskId: action.researchTask.id,
      computeTargetId: target.id,
    });
  }
  return computeModule.releaseTarget({
    computeTargetId: target.id,
    researchTaskId: action.researchTaskId,
    reason: action.reason,
  });
}
