import { z } from "zod";

import { baselineRepository } from "../../../data/repositories/baselines";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
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
