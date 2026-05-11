import type { ClaudeAgentToolDefinition } from "./types";
import { evaluationRepository } from "../../../data/repositories/evaluations";
import { scienceRoles } from "./__shared__/roles";
import { toolTransitionModule } from "./__shared__/tool-transition-module";

export const acceptEvaluationTool: ClaudeAgentToolDefinition = toolTransitionModule.define({
  name: "accept_evaluation",
  description: "Accept an evaluation with a transition comment.",
  roles: scienceRoles,
  idKey: "evaluationId",
  idDescription: "Evaluation id to accept.",
  handler: ({ id, comment, actorAgentId }) =>
    evaluationRepository.accept({ evaluationId: id, comment, actorAgentId }),
  resultKey: "evaluation",
});
