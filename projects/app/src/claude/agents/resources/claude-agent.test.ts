import { describe, expect, test } from "bun:test";

import { managerBlueprint, headlessManagerBlueprint } from "../roles/manager/blueprint";
import { reporterBlueprint } from "../roles/reporter/blueprint";
import { scientistBlueprint } from "../roles/scientist/blueprint";
import { scribeBlueprint } from "../roles/scribe/blueprint";
import { verifierBlueprint } from "../roles/verifier/blueprint";
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

  test("uses a headless manager tool surface without user questions", () => {
    const toolNames = claudeAgentToolsForBlueprint({ blueprint: headlessManagerBlueprint }).map(
      (tool) => ("name" in tool ? tool.name : ""),
    );

    expect(toolNames).not.toContain("ask_user_question");
    expect(toolNames).toContain("create_project_baseline");
    expect(toolNames).toContain("create_research_task");
  });

  test("enables web_search for ideation-friendly roles", () => {
    const ideationRoles = [
      { name: "manager", blueprint: managerBlueprint },
      { name: "headless manager", blueprint: headlessManagerBlueprint },
      { name: "scientist", blueprint: scientistBlueprint },
      { name: "reporter", blueprint: reporterBlueprint },
      { name: "scribe", blueprint: scribeBlueprint },
    ];

    for (const { name, blueprint } of ideationRoles) {
      expect(blueprint.webSearchEnabled, `${name} blueprint should opt into web_search`).toBe(true);
      const tools = claudeAgentToolsForBlueprint({ blueprint });
      const toolset = tools.find((tool) => tool.type === "agent_toolset_20260401");
      expect(toolset?.configs, `${name} toolset configs`).toContainEqual({
        name: "web_search",
        enabled: true,
        permission_policy: { type: "always_allow" },
      });
    }
  });

  test("does not expose web_search to the Verifier", () => {
    expect(verifierBlueprint.webSearchEnabled).toBe(false);
    const tools = claudeAgentToolsForBlueprint({ blueprint: verifierBlueprint });
    const toolset = tools.find((tool) => tool.type === "agent_toolset_20260401");
    const configNames = toolset?.configs?.map((config) => config.name) ?? [];
    expect(configNames).not.toContain("web_search");
  });
});
