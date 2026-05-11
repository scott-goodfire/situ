import type { ClaudeAgentSkillDefinition } from "./types";

export const claudeAgentSkillDefinitions: readonly ClaudeAgentSkillDefinition[] = [
  {
    name: "situ-manager-runtime",
    displayTitle: "situ Manager Runtime",
    directoryName: "situ-manager-runtime",
    roles: ["manager"],
  },
  {
    name: "situ-scientist-runtime",
    displayTitle: "situ Scientist Runtime",
    directoryName: "situ-scientist-runtime",
    roles: ["scientist"],
  },
  {
    name: "situ-scientist-explore-task",
    displayTitle: "situ Scientist Explore Task",
    directoryName: "situ-scientist-explore-task",
    roles: ["scientist"],
  },
  {
    name: "situ-scientist-exploit-task",
    displayTitle: "situ Scientist Exploit Task",
    directoryName: "situ-scientist-exploit-task",
    roles: ["scientist"],
  },
  {
    name: "situ-scientist-debug-task",
    displayTitle: "situ Scientist Debug Task",
    directoryName: "situ-scientist-debug-task",
    roles: ["scientist"],
  },
  {
    name: "situ-scientist-synthesize-task",
    displayTitle: "situ Scientist Synthesize Task",
    directoryName: "situ-scientist-synthesize-task",
    roles: ["scientist"],
  },
  {
    name: "situ-scientist-prune-task",
    displayTitle: "situ Scientist Prune Task",
    directoryName: "situ-scientist-prune-task",
    roles: ["scientist"],
  },
  {
    name: "situ-verifier-runtime",
    displayTitle: "situ Verifier Runtime",
    directoryName: "situ-verifier-runtime",
    roles: ["verifier"],
  },
  {
    name: "situ-verifier-verify-task",
    displayTitle: "situ Verifier Verify Task",
    directoryName: "situ-verifier-verify-task",
    roles: ["verifier"],
  },
  {
    name: "situ-scribe-runtime",
    displayTitle: "situ Scribe Runtime",
    directoryName: "situ-scribe-runtime",
    roles: ["scribe"],
  },
  {
    name: "situ-scribe-narrate-session",
    displayTitle: "situ Scribe Narrate Session",
    directoryName: "situ-scribe-narrate-session",
    roles: ["scribe"],
  },
  {
    name: "situ-reporter-runtime",
    displayTitle: "situ Reporter Runtime",
    directoryName: "situ-reporter-runtime",
    roles: ["reporter"],
  },
  {
    name: "situ-reporter-generate-report",
    displayTitle: "situ Reporter Generate Report",
    directoryName: "situ-reporter-generate-report",
    roles: ["reporter"],
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
