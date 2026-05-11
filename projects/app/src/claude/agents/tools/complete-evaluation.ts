import type { ClaudeAgentToolDefinition } from "./types";
import { evaluationRepository } from "../../../data/repositories/evaluations";
import { scienceRoles } from "./__shared__/roles";
import { toolTransitionModule } from "./__shared__/tool-transition-module";

export const completeEvaluationTool: ClaudeAgentToolDefinition = toolTransitionModule.define({
  name: "complete_evaluation",
  description: "Mark an evaluation done with a transition comment.",
  roles: scienceRoles,
  idKey: "evaluationId",
  idDescription: "Evaluation id to complete.",
  handler: ({ id, comment, actorAgentId }) =>
    evaluationRepository.complete({ evaluationId: id, comment, actorAgentId }),
  resultKey: "evaluation",
});
