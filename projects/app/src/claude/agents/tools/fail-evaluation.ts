import type { ClaudeAgentToolDefinition } from "./types";
import { evaluationRepository } from "../../../data/repositories/evaluations";
import { scienceRoles } from "./__shared__/roles";
import { toolTransitionModule } from "./__shared__/tool-transition-module";

export const failEvaluationTool: ClaudeAgentToolDefinition = toolTransitionModule.define({
  name: "fail_evaluation",
  description: "Mark an evaluation failed with a transition comment.",
  roles: scienceRoles,
  idKey: "evaluationId",
  idDescription: "Evaluation id to fail.",
  handler: ({ id, comment, actorAgentId }) =>
    evaluationRepository.fail({ evaluationId: id, comment, actorAgentId }),
  resultKey: "evaluation",
});
