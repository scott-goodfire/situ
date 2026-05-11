import { describe, expect, test } from "bun:test";

import {
  CLAUDE_AGENT_TURN_WORK_ITEM_PURPOSE,
  CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE,
  CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
  CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE,
  type WorkItem,
} from "../../../runtime/work-items/types";
import { roleForWorkItem } from "./role-for-work-item";

describe("roleForWorkItem", () => {
  test("maps queued Claude work purposes to Managed Agent roles", () => {
    expect(
      roleForWorkItem({ workItem: workItemFor(CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE) }),
    ).toBe("manager");
    expect(
      roleForWorkItem({ workItem: workItemFor(CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE) }),
    ).toBe("scientist");
    expect(
      roleForWorkItem({ workItem: workItemFor(CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE) }),
    ).toBe("verifier");
  });

  test("defaults direct Claude agent turns to Manager", () => {
    expect(roleForWorkItem({ workItem: workItemFor(CLAUDE_AGENT_TURN_WORK_ITEM_PURPOSE) })).toBe(
      "manager",
    );
  });
});

function workItemFor(purpose: string): WorkItem {
  return {
    id: "work_1",
    purpose,
    targetKind: "researchProject",
    targetId: "research_project_1",
    status: "pending",
    ownerAgentId: null,
    ownerWorkflowId: null,
    attempt: 0,
    availableAt: "2026-05-10T00:00:00.000Z",
    claimedAt: null,
    leaseExpiresAt: null,
    completedAt: null,
    payloadJson: "{}",
    syncVersion: 1,
    syncDeleted: false,
    createdAt: "2026-05-10T00:00:00.000Z",
    updatedAt: "2026-05-10T00:00:00.000Z",
  };
}
