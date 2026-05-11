import type { ClaudeAgentToolDefinition } from "./types";
import { evaluationRepository } from "../../../data/repositories/evaluations";
import { scienceRoles } from "./__shared__/roles";
import { toolTransitionModule } from "./__shared__/tool-transition-module";

export const submitEvaluationTool: ClaudeAgentToolDefinition = toolTransitionModule.define({
  name: "submit_evaluation",
  description: "Submit an evaluation for review with a transition comment.",
  roles: scienceRoles,
  idKey: "evaluationId",
  idDescription: "Evaluation id to submit.",
  handler: ({ id, comment, actorAgentId }) =>
    evaluationRepository.submit({ evaluationId: id, comment, actorAgentId }),
  resultKey: "evaluation",
});
