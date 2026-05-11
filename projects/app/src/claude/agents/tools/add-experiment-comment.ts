import { z } from "zod";

import { experimentRepository } from "../../../data/repositories/experiments";
import { defineTool } from "./__shared__/define-tool";
import { scienceRoles } from "./__shared__/roles";

const inputSchema = z.object({
  experimentId: z.string().describe("Experiment id."),
  body: z.string().describe("Short human comment, usually one sentence."),
});

export const addExperimentCommentTool = defineTool({
  name: "add_experiment_comment",
  description: "Add a durable comment to a situ experiment.",
  roles: scienceRoles,
  inputSchema,
  handler: async ({ input, context }) => ({
    activity: await experimentRepository.addComment({
      experimentId: input.experimentId,
      actorAgentId: context.agentId,
      body: input.body,
    }),
  }),
});
