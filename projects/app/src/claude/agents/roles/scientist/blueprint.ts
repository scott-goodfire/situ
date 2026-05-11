import { DEFAULT_CLAUDE_AGENT_MODEL } from "../models";
import type { ClaudeAgentBlueprint } from "../types";
import { SCIENTIST_SYSTEM } from "./system";

export const scientistBlueprint: ClaudeAgentBlueprint = {
  role: "scientist",
  dbId: "scientist",
  displayName: "Scientist",
  model: DEFAULT_CLAUDE_AGENT_MODEL,
  system: SCIENTIST_SYSTEM,
  defaultToolsetEnabled: false,
  webSearchEnabled: true,
  skillNames: [
    "situ-scientist-runtime",
    "situ-scientist-explore-task",
    "situ-scientist-exploit-task",
    "situ-scientist-debug-task",
    "situ-scientist-synthesize-task",
    "situ-scientist-prune-task",
  ],
};
