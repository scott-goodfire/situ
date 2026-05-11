import type { ClaudeAgentSkillDefinition } from "./types";

export const claudeAgentSkillDefinitions: readonly ClaudeAgentSkillDefinition[] = [
  {
    name: "situ-manager-runtime",
    displayTitle: "Situ Manager Runtime",
    directoryName: "situ-manager-runtime",
    roles: ["manager"],
  },
  {
    name: "situ-scientist-runtime",
    displayTitle: "Situ Scientist Runtime",
    directoryName: "situ-scientist-runtime",
    roles: ["scientist"],
  },
  {
    name: "situ-scientist-explore-task",
    displayTitle: "Situ Scientist Explore Task",
    directoryName: "situ-scientist-explore-task",
    roles: ["scientist"],
  },
  {
    name: "situ-scientist-exploit-task",
    displayTitle: "Situ Scientist Exploit Task",
    directoryName: "situ-scientist-exploit-task",
    roles: ["scientist"],
  },
  {
    name: "situ-scientist-debug-task",
    displayTitle: "Situ Scientist Debug Task",
    directoryName: "situ-scientist-debug-task",
    roles: ["scientist"],
  },
  {
    name: "situ-scientist-synthesize-task",
    displayTitle: "Situ Scientist Synthesize Task",
    directoryName: "situ-scientist-synthesize-task",
    roles: ["scientist"],
  },
  {
    name: "situ-scientist-prune-task",
    displayTitle: "Situ Scientist Prune Task",
    directoryName: "situ-scientist-prune-task",
    roles: ["scientist"],
  },
  {
    name: "situ-verifier-runtime",
    displayTitle: "Situ Verifier Runtime",
    directoryName: "situ-verifier-runtime",
    roles: ["verifier"],
  },
  {
    name: "situ-verifier-verify-task",
    displayTitle: "Situ Verifier Verify Task",
    directoryName: "situ-verifier-verify-task",
    roles: ["verifier"],
  },
];

export function claudeAgentSkillDefinitionByName({
  name,
}: {
  name: string;
}): ClaudeAgentSkillDefinition {
  const definition = claudeAgentSkillDefinitions.find((candidate) => candidate.name === name);
  if (!definition) {
    throw new Error(`Claude agent skill is not registered: ${name}`);
  }
  return definition;
}
