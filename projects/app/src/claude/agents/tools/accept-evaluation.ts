import { z } from "zod";

import { evaluationRepository } from "@situ/research-records";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { scienceRoles } from "./__shared__/roles";

const inputSchema = z.object({
  evaluationId: z.string().describe("Evaluation id to accept."),
  comment: z.string().describe("Short transition comment explaining the decision."),
});

export const acceptEvaluationTool = defineTool({
  name: "accept_evaluation",
  description: "Accept an evaluation with a transition comment.",
  roles: scienceRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input, context }) => {
    const evaluation = await evaluationRepository.accept({
      evaluationId: input.evaluationId,
      comment: input.comment,
      actorAgentId: context.agentId,
    });
    return Result.ok({ evaluation });
  },
});
