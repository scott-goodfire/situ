import { z } from "zod";

import { evaluationRepository } from "../../../data/repositories/evaluations";
import { defineTool } from "./__shared__/define-tool";
import { scienceRoles } from "./__shared__/roles";

const inputSchema = z.object({
  evaluationId: z.string().describe("Evaluation id."),
  body: z.string().describe("Short human comment, usually one sentence."),
});

export const addEvaluationCommentTool = defineTool({
  name: "add_evaluation_comment",
  description: "Add a durable comment to a situ evaluation.",
  roles: scienceRoles,
  inputSchema,
  handler: async ({ input, context }) => ({
    activity: await evaluationRepository.addComment({
      evaluationId: input.evaluationId,
      actorAgentId: context.agentId,
      body: input.body,
    }),
  }),
});
