import { workItemModule, type WorkItem } from "@situ/work-items";

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
    const payload = workItemModule.payload({ workItem });
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
