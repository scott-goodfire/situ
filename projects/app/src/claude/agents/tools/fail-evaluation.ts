import { z } from "zod";

import { evaluationRepository } from "@situ/research-records";
import { defineTool } from "./define-tool";
import { Result } from "@situ/agent-tools";
import { scienceRoles } from "./__shared__/roles";

const inputSchema = z.object({
  evaluationId: z.string().describe("Evaluation id to fail."),
  comment: z.string().describe("Short transition comment explaining the decision."),
});

export const failEvaluationTool = defineTool({
  name: "fail_evaluation",
  description: "Mark an evaluation failed with a transition comment.",
  roles: scienceRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input, context }) => {
    const evaluation = await evaluationRepository.fail({
      evaluationId: input.evaluationId,
      comment: input.comment,
      actorAgentId: context.agentId,
    });
    return Result.ok({ evaluation });
  },
});
