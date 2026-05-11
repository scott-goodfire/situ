import type { ClaudeAgentToolDefinition } from "./types";
import { evaluationRepository } from "../../../data/repositories/evaluations";
import { scienceRoles } from "./__shared__/roles";
import { toolTransitionModule } from "./__shared__/tool-transition-module";

export const cancelEvaluationTool: ClaudeAgentToolDefinition = toolTransitionModule.define({
  name: "cancel_evaluation",
  description: "Cancel an evaluation with a transition comment.",
  roles: scienceRoles,
  idKey: "evaluationId",
  idDescription: "Evaluation id to cancel.",
  handler: ({ id, comment, actorAgentId }) =>
    evaluationRepository.cancel({ evaluationId: id, comment, actorAgentId }),
  resultKey: "evaluation",
});
