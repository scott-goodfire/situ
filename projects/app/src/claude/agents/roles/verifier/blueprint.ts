import { DEFAULT_CLAUDE_AGENT_MODEL } from "../models";
import type { ClaudeAgentBlueprint } from "../types";
import { VERIFIER_SYSTEM } from "./system";

export const verifierBlueprint: ClaudeAgentBlueprint = {
  role: "verifier",
  dbId: "verifier",
  displayName: "Verifier",
  model: DEFAULT_CLAUDE_AGENT_MODEL,
  system: VERIFIER_SYSTEM,
  defaultToolsetEnabled: false,
  webSearchEnabled: false,
  skillNames: ["situ-verifier-runtime", "situ-verifier-verify-task"],
};
