import { expect, test } from "bun:test";

import { AGENT_STATUSES, agentsModule } from ".";

test("exports agent module metadata", () => {
  expect(agentsModule.name).toBe("@situ/agents");
  expect(AGENT_STATUSES).toContain("active");
});
