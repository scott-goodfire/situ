import { expect, test } from "bun:test";

import { agentSessionsModule, AGENT_SESSION_STATUSES } from ".";

test("exports agent session module metadata", () => {
  expect(agentSessionsModule.name).toBe("@situ/agent-sessions");
  expect(AGENT_SESSION_STATUSES).toContain("idle");
});
