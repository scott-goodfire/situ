import { PreconditionError } from "../../../../data/repositories/__shared__";
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
  throw new PreconditionError({
    code: "missing_research_project_context",
    hint: "Pass researchProjectId explicitly; the active work item is not a ResearchProject.",
    details: { targetKind: context.workItem.targetKind, targetId: context.workItem.targetId },
  });
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
    throw new PreconditionError({
      code: "missing_active_research_task_context",
      hint: "Pass researchTaskId explicitly; no active ResearchTask is assigned to this work item.",
      details: { targetKind: context.workItem.targetKind, targetId: context.workItem.targetId },
    });
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
    throw new PreconditionError({
      code: "missing_active_research_task_context",
      hint: "Pass researchTaskId explicitly; no active ResearchTask is assigned to this work item.",
      details: { targetKind: context.workItem.targetKind, targetId: context.workItem.targetId },
    });
  }
  return value;
}

export const toolContextModule = {
  requiredResearchTaskId,
  researchProjectId,
  researchTaskId,
} as const;
