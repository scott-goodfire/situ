import type { ClaudeAgentBlueprint, ClaudeAgentExecutionMode, ClaudeAgentRole } from "./types";
import { headlessManagerBlueprint, managerBlueprint } from "./manager/blueprint";
import { reporterBlueprint } from "./reporter/blueprint";
import { scientistBlueprint } from "./scientist/blueprint";
import { scribeBlueprint } from "./scribe/blueprint";
import { verifierBlueprint } from "./verifier/blueprint";

const claudeAgentBlueprints = [
  managerBlueprint,
  headlessManagerBlueprint,
  scientistBlueprint,
  verifierBlueprint,
  scribeBlueprint,
  reporterBlueprint,
] as const satisfies readonly ClaudeAgentBlueprint[];

export const defaultClaudeAgentBlueprint = managerBlueprint;

export function claudeAgentBlueprintForRole({
  role,
  executionMode = "interactive",
  modelOverride,
}: {
  role: ClaudeAgentRole;
  executionMode?: ClaudeAgentExecutionMode;
  modelOverride?: string;
}): ClaudeAgentBlueprint {
  const blueprint = claudeAgentBlueprints.find(
    (candidate) =>
      candidate.role === role && (candidate.executionMode ?? "interactive") === executionMode,
  );
  if (!blueprint) {
    throw new Error(`Claude agent role is not registered: ${role} (${executionMode})`);
  }
  if (modelOverride) {
    return { ...blueprint, model: modelOverride };
  }
  return blueprint;
}
