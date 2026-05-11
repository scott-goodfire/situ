import type { ClaudeAgentToolContext } from "../types";

function researchProjectId({
  explicit,
  context,
}: {
  explicit?: string;
  context: ClaudeAgentToolContext;
}): string {
  if (explicit) {
    return explicit;
  }
  if (context.workItem.targetKind === "researchProject") {
    return context.workItem.targetId;
  }
  throw new Error("researchProjectId is required outside ResearchProject work.");
}

function researchTaskId({
  explicit,
  context,
  required = true,
}: {
  explicit?: string;
  context: ClaudeAgentToolContext;
  required?: boolean;
}): string | undefined {
  const value = explicit ?? context.activeResearchTaskId;
  if (!value && required) {
    throw new Error("researchTaskId is required because no active ResearchTask is assigned.");
  }
  return value;
}

function requiredResearchTaskId({
  explicit,
  context,
}: {
  explicit?: string;
  context: ClaudeAgentToolContext;
}): string {
  const value = researchTaskId({ explicit, context });
  if (!value) {
    throw new Error("researchTaskId is required because no active ResearchTask is assigned.");
  }
  return value;
}

export const toolContextModule = {
  requiredResearchTaskId,
  researchProjectId,
  researchTaskId,
} as const;
