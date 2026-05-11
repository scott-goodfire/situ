import { jsonModule } from "../../modules/json";
import { workItemPayloadSchema, type WorkItem, type WorkItemPayload } from "./types";

export function workItemPayload({ workItem }: { workItem: WorkItem }): WorkItemPayload {
  const raw = jsonModule.parseRecord({ raw: workItem.payloadJson });
  const result = workItemPayloadSchema.safeParse(raw);
  return result.success ? result.data : {};
}
