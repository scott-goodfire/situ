import { computeStringPayloadValue, workItemPayload } from "../__shared__";
import type { WorkItemLike } from "../types";
import { releaseTarget } from "./release-target";

export async function releaseForWorkItem({
  workItem,
  reason,
}: {
  workItem: WorkItemLike;
  reason: string;
}): Promise<void> {
  const payload = workItemPayload({ workItem });
  const computeTargetId = computeStringPayloadValue({ payload, key: "computeTargetId" });
  if (!computeTargetId) {
    return;
  }
  await releaseTarget({
    computeTargetId,
    researchTaskId: computeStringPayloadValue({
      payload,
      key: "activeResearchTaskId",
    }),
    reason,
  });
}
