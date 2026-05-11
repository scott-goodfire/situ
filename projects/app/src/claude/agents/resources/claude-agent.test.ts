import { describe, expect, test } from "bun:test";

import { scientistBlueprint } from "../roles/scientist/blueprint";
import { claudeAgentToolsForBlueprint } from "./claude-agent";

describe("Claude managed agent resources", () => {
  test("enables built-in read tool for runtime skills", () => {
    const tools = claudeAgentToolsForBlueprint({ blueprint: scientistBlueprint });
    const toolset = tools.find((tool) => tool.type === "agent_toolset_20260401");

    expect(toolset?.default_config?.enabled).toBe(false);
    expect(toolset?.configs).toContainEqual({
      name: "read",
      enabled: true,
      permission_policy: { type: "always_allow" },
    });
  });
});
