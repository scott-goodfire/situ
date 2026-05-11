import type { ClaudeAgentBlueprint } from "../types";
import { DEFAULT_CLAUDE_AGENT_MODEL } from "../models";
import { MANAGER_SYSTEM } from "./system";

export const managerBlueprint: ClaudeAgentBlueprint = {
  role: "manager",
  executionMode: "interactive",
  dbId: "default",
  displayName: "situ",
  model: DEFAULT_CLAUDE_AGENT_MODEL,
  system: MANAGER_SYSTEM,
  defaultToolsetEnabled: false,
  webSearchEnabled: true,
  skillNames: ["situ-manager-runtime"],
};

export const headlessManagerBlueprint: ClaudeAgentBlueprint = {
  ...managerBlueprint,
  executionMode: "headless",
  dbId: "manager_headless",
  displayName: "situ headless",
};
