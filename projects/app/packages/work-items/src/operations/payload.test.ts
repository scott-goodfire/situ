import { describe, expect, test } from "bun:test";

import { workItemPayload } from "./payload";
import { nowIso } from "../__shared__";
import type { WorkItem } from "../types";

describe("work item payload parsing", () => {
  test("returns parsed object payloads typed by the payload schema", () => {
    const workItem = workItemRecord({ payloadJson: '{"activeResearchTaskId":"task_1"}' });

    const payload = workItemPayload({ workItem });
    expect(payload).toEqual({ activeResearchTaskId: "task_1" });
    expect(payload.activeResearchTaskId).toBe("task_1");
  });

  test("rejects wrong typed known fields and treats malformed input as empty", () => {
    expect(workItemPayload({ workItem: workItemRecord({ payloadJson: "not json" }) })).toEqual({});
    expect(workItemPayload({ workItem: workItemRecord({ payloadJson: "[]" }) })).toEqual({});
    expect(
      workItemPayload({
        workItem: workItemRecord({ payloadJson: '{"activeResearchTaskId":123}' }),
      }).activeResearchTaskId,
    ).toBeUndefined();
  });

  test("preserves extra fields via loose passthrough", () => {
    const workItem = workItemRecord({
      payloadJson: '{"content":"go","ownerNote":"keep me"}',
    });
    const payload = workItemPayload({ workItem });
    expect(payload.content).toBe("go");
    expect((payload as Record<string, unknown>).ownerNote).toBe("keep me");
  });
});

function workItemRecord({ payloadJson }: { payloadJson: string }): WorkItem {
  const now = nowIso();
  return {
    id: "work_item_payload_test",
    purpose: "test",
    targetKind: "test",
    targetId: "target",
    status: "pending",
    ownerAgentId: null,
    ownerWorkflowId: null,
    attempt: 0,
    availableAt: now,
    claimedAt: null,
    leaseExpiresAt: null,
    completedAt: null,
    payloadJson,
    syncVersion: 1,
    syncDeleted: false,
    createdAt: now,
    updatedAt: now,
  };
}
