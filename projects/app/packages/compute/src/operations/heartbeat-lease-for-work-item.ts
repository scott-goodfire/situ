import { COMPUTE_HEARTBEAT_SECONDS } from "../constants";
import { computeTargetRepository } from "../repository";
import { computeStringPayloadValue, workItemPayload } from "../__shared__";
import type { WorkItemLike } from "../types";

export async function heartbeatLeaseForWorkItem({
  workItem,
}: {
  workItem: WorkItemLike;
}): Promise<void> {
  const payload = workItemPayload({ workItem });
  const computeTargetId = computeStringPayloadValue({ payload, key: "computeTargetId" });
  if (!computeTargetId) {
    return;
  }
  await computeTargetRepository.heartbeat({
    computeTargetId,
    owningResearchTaskId: computeStringPayloadValue({
      payload,
      key: "activeResearchTaskId",
    }),
    leaseSeconds: COMPUTE_HEARTBEAT_SECONDS,
  });
}
