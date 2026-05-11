import { modelForEffort } from "../models";
import type { ClaudeAgentBlueprint } from "../types";
import { SCRIBE_SYSTEM } from "./system";

export const scribeBlueprint: ClaudeAgentBlueprint = {
  role: "scribe",
  dbId: "scribe",
  displayName: "Scribe",
  // Scribe is always Sonnet regardless of SITU_EFFORT — high-frequency narration
  // doesn't benefit from Opus and would burn cost.
  model: modelForEffort({ effort: "medium" }),
  system: SCRIBE_SYSTEM,
  defaultToolsetEnabled: false,
  skillNames: ["situ-scribe-runtime", "situ-scribe-narrate-session"],
};
