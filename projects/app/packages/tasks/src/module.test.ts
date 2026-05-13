import { expect, test } from "bun:test";

import { TASK_STATUSES, TASK_TYPES, tasksModule } from ".";

test("exports task statuses and types", () => {
  expect(tasksModule.name).toBe("@situ/tasks");
  expect(TASK_STATUSES).toContain("in_review");
  expect(TASK_TYPES).toContain("implementation");
});
