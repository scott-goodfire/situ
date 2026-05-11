import type { ClaudeAgentBlueprint, ClaudeAgentRole } from "./types";
import { managerBlueprint } from "./manager/blueprint";
import { scientistBlueprint } from "./scientist/blueprint";
import { verifierBlueprint } from "./verifier/blueprint";

const claudeAgentBlueprints = [
  managerBlueprint,
  scientistBlueprint,
  verifierBlueprint,
] as const satisfies readonly ClaudeAgentBlueprint[];

export const defaultClaudeAgentBlueprint = managerBlueprint;

export function claudeAgentBlueprintForRole({
  role,
}: {
  role: ClaudeAgentRole;
}): ClaudeAgentBlueprint {
  const blueprint = claudeAgentBlueprints.find((candidate) => candidate.role === role);
  if (!blueprint) {
    throw new Error(`Claude agent role is not registered: ${role}`);
  }

  return blueprint;
}
