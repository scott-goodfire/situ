import type { ComputeTargetRecord } from "@situ/compute";

import type { ResearchTaskRecord } from "../../data/repositories/research-tasks";

export enum ComputeLeaseRecoveryActionKind {
  Keep = "keep",
  Release = "release",
  RecoverResearchTaskAndRelease = "recover_research_task_and_release",
}

enum ComputeLeaseRecoveryReason {
  ExpiredWithoutOpenWorkItem = "expired_without_open_work_item",
  NoClaimant = "no_claimant",
  ResearchTaskTerminal = "research_task_terminal",
}

export type ComputeLeaseRecoveryAction =
  | { kind: ComputeLeaseRecoveryActionKind.Keep }
  | {
      kind: ComputeLeaseRecoveryActionKind.Release;
      reason: ComputeLeaseRecoveryReason;
      researchTaskId?: string;
    }
  | {
      kind: ComputeLeaseRecoveryActionKind.RecoverResearchTaskAndRelease;
      reason: ComputeLeaseRecoveryReason.ExpiredWithoutOpenWorkItem;
      researchTask: ResearchTaskRecord;
      researchTaskId: string;
    };

export function computeLeaseRecoveryAction({
  target,
  researchTask,
  hasOpenWorkItem,
  now,
}: {
  target: ComputeTargetRecord;
  researchTask: ResearchTaskRecord | undefined;
  hasOpenWorkItem: boolean;
  now: string;
}): ComputeLeaseRecoveryAction {
  const researchTaskId = target.claimedByResearchTaskId ?? undefined;
  if (!researchTaskId) {
    return releaseAction({ reason: ComputeLeaseRecoveryReason.NoClaimant });
  }
  if (!researchTask || researchTaskIsTerminal({ researchTask })) {
    return releaseAction({
      researchTaskId,
      reason: ComputeLeaseRecoveryReason.ResearchTaskTerminal,
    });
  }
  if (!leaseExpiredWithoutOpenWork({ target, hasOpenWorkItem, now })) {
    return { kind: ComputeLeaseRecoveryActionKind.Keep };
  }
  if (researchTask.status === "running") {
    return {
      kind: ComputeLeaseRecoveryActionKind.RecoverResearchTaskAndRelease,
      reason: ComputeLeaseRecoveryReason.ExpiredWithoutOpenWorkItem,
      researchTask,
      researchTaskId,
    };
  }
  return releaseAction({
    researchTaskId,
    reason: ComputeLeaseRecoveryReason.ExpiredWithoutOpenWorkItem,
  });
}

function releaseAction({
  reason,
  researchTaskId,
}: {
  reason: ComputeLeaseRecoveryReason;
  researchTaskId?: string;
}): ComputeLeaseRecoveryAction {
  return {
    kind: ComputeLeaseRecoveryActionKind.Release,
    reason,
    researchTaskId,
  };
}

function researchTaskIsTerminal({ researchTask }: { researchTask: ResearchTaskRecord }): boolean {
  return ["verified", "rejected", "pruned", "failed", "canceled"].includes(researchTask.status);
}

function leaseExpiredWithoutOpenWork({
  target,
  hasOpenWorkItem,
  now,
}: {
  target: ComputeTargetRecord;
  hasOpenWorkItem: boolean;
  now: string;
}): boolean {
  return Boolean(target.leaseExpiresAt && target.leaseExpiresAt <= now && !hasOpenWorkItem);
}
