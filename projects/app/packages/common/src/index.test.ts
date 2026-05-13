import { expect, test } from "bun:test";
import { DateTime } from "luxon";

import { addDurationToIso, createId, isKnownTargetKind, nowIso, SYSTEM_ACTOR } from ".";

test("creates prefixed ids", () => {
  expect(createId("task", () => "00000000-0000-4000-8000-000000000000")).toBe(
    "task_00000000000040008000000000000000",
  );
});

test("exports shared actor and target helpers", () => {
  expect(SYSTEM_ACTOR.actorKind).toBe("system");
  expect(isKnownTargetKind("task")).toBe(true);
});

test("creates deterministic ISO timestamps with Luxon helpers", () => {
  const timestamp = nowIso({
    now: DateTime.utc(2026, 5, 12, 12, 0, 0),
  });

  expect(timestamp).toBe("2026-05-12T12:00:00.000Z");
  expect(
    addDurationToIso({
      duration: {
        minutes: 15,
      },
      timestamp,
    }),
  ).toBe("2026-05-12T12:15:00.000Z");
});
