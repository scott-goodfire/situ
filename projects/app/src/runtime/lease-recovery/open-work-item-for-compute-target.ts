import type { WorkItem } from "../../data/db/schema";
import { workItemPayload } from "../work-items/payload";

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
      readPayloadString({ payload, key: "activeResearchTaskId" }) === researchTaskId &&
      readPayloadString({ payload, key: "computeTargetId" }) === targetId
    );
  });
}

function readPayloadString({
  payload,
  key,
}: {
  payload: Record<string, unknown>;
  key: string;
}): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
