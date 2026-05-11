import { modelForEffort } from "../models";
import type { ClaudeAgentBlueprint } from "../types";
import { REPORTER_SYSTEM } from "./system";

export const reporterBlueprint: ClaudeAgentBlueprint = {
  role: "reporter",
  dbId: "reporter",
  displayName: "Reporter",
  model: modelForEffort({ effort: "high" }),
  system: REPORTER_SYSTEM,
  defaultToolsetEnabled: false,
  skillNames: ["situ-reporter-runtime", "situ-reporter-generate-report"],
};
