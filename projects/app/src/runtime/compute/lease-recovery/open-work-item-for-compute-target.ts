import type { WorkItem } from "../../../data/db/schema";
import { workItemPayload } from "../../work-items/payload";
import { computeStringPayloadValue } from "../record-values";

export function hasOpenWorkItemForComputeTarget({
  openWorkItems,
  targetId,
  researchTaskId,
}: {
  openWorkItems: WorkItem[];
  targetId: string;
  researchTaskId: string;
}): boolean {
  return openWorkItems.some((workItem) => {
    const payload = workItemPayload({ workItem });
    return (
      computeStringPayloadValue({ payload, key: "activeResearchTaskId" }) === researchTaskId &&
      computeStringPayloadValue({ payload, key: "computeTargetId" }) === targetId
    );
  });
}
