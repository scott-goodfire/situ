import { parseRecord } from "../__shared__";
import { workItemPayloadSchema, type WorkItem, type WorkItemPayload } from "../types";

export function workItemPayload({ workItem }: { workItem: WorkItem }): WorkItemPayload {
  const raw = parseRecord({ raw: workItem.payloadJson });
  const result = workItemPayloadSchema.safeParse(raw);
  return result.success ? result.data : {};
}
