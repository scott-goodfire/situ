import { z } from "zod";

import { baselineRepository } from "@situ/research-records";
import { defineTool } from "./define-tool";
import { Result } from "@situ/agent-tools";
import { scienceRoles } from "./__shared__/roles";

const inputSchema = z.object({
  baselineId: z.string().describe("Baseline id to submit."),
  comment: z.string().describe("Short transition comment explaining the decision."),
});

export const submitBaselineTool = defineTool({
  name: "submit_baseline",
  description: "Submit a baseline for review with a transition comment.",
  roles: scienceRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input, context }) => {
    const baseline = await baselineRepository.submit({
      baselineId: input.baselineId,
      comment: input.comment,
      actorAgentId: context.agentId,
    });
    return Result.ok({ baseline });
  },
});
