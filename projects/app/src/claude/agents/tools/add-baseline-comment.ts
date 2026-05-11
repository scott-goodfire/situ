import { z } from "zod";

import { baselineRepository } from "../../../data/repositories/baselines";
import { defineTool } from "./__shared__/define-tool";
import { scienceRoles } from "./__shared__/roles";

const inputSchema = z.object({
  baselineId: z.string().describe("Baseline id."),
  body: z.string().describe("Short human comment, usually one sentence."),
});

export const addBaselineCommentTool = defineTool({
  name: "add_baseline_comment",
  description: "Add a durable comment to a Situ baseline.",
  roles: scienceRoles,
  inputSchema,
  handler: async ({ input, context }) => ({
    activity: await baselineRepository.addComment({
      baselineId: input.baselineId,
      actorAgentId: context.agentId,
      body: input.body,
    }),
  }),
});
