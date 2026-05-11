import type { ClaudeAgentBlueprint } from "../types";
import { DEFAULT_CLAUDE_AGENT_MODEL } from "../models";
import { MANAGER_SYSTEM } from "./system";

export const managerBlueprint: ClaudeAgentBlueprint = {
  role: "manager",
  dbId: "default",
  displayName: "Situ",
  model: DEFAULT_CLAUDE_AGENT_MODEL,
  system: MANAGER_SYSTEM,
  defaultToolsetEnabled: false,
  skillNames: ["situ-manager-runtime"],
};
