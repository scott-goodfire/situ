import { expect, test } from "bun:test";

import { EXPERIMENT_STATUSES, experimentsModule } from ".";

test("exports experiment module metadata", () => {
  expect(experimentsModule.name).toBe("@situ/experiments");
  expect(EXPERIMENT_STATUSES).toContain("in_review");
});
