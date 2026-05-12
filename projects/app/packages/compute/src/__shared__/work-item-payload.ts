import { parseRecord } from "@situ/common";
import type { WorkItemLike } from "../types";

export function workItemPayload({ workItem }: { workItem: WorkItemLike }): Record<string, unknown> {
  return parseRecord({ raw: workItem.payloadJson });
}
