import { expect, test } from "bun:test";

import { createId, isKnownTargetKind, SYSTEM_ACTOR } from ".";

test("creates prefixed ids", () => {
  expect(createId("task", () => "00000000-0000-4000-8000-000000000000")).toBe(
    "task_00000000000040008000000000000000",
  );
});

test("exports shared actor and target helpers", () => {
  expect(SYSTEM_ACTOR.actorKind).toBe("system");
  expect(isKnownTargetKind("task")).toBe(true);
});
