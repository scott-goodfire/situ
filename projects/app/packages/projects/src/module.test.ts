import { expect, test } from "bun:test";

import { PROJECT_STATUSES, projectsModule } from ".";

test("exports project module metadata", () => {
  expect(projectsModule.name).toBe("@situ/projects");
  expect(PROJECT_STATUSES).toContain("active");
});
