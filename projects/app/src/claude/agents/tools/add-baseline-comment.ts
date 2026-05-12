import { z } from "zod";

import { baselineRepository } from "@situ/research-records";
import { defineTool } from "./define-tool";
import { Result } from "@situ/agent-tools";
import { scienceRoles } from "./__shared__/roles";

const inputSchema = z.object({
  baselineId: z.string().describe("Baseline id."),
  body: z.string().describe("Short human comment, usually one sentence."),
});

export const addBaselineCommentTool = defineTool({
  name: "add_baseline_comment",
  description: "Add a durable comment to a situ baseline.",
  roles: scienceRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input, context }) => {
    const activity = await baselineRepository.addComment({
      baselineId: input.baselineId,
      actorAgentId: context.agentId,
      body: input.body,
    });
    return Result.ok({ activity });
  },
});
