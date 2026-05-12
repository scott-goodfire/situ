import { z } from "zod";

import { baselineRepository } from "@situ/research-records";
import { defineTool } from "./define-tool";
import { Result } from "@situ/agent-tools";
import { scienceRoles } from "./__shared__/roles";

const inputSchema = z.object({
  baselineId: z.string().describe("Baseline id to cancel."),
  comment: z.string().describe("Short transition comment explaining the decision."),
});

export const cancelBaselineTool = defineTool({
  name: "cancel_baseline",
  description: "Cancel a baseline with a transition comment.",
  roles: scienceRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input, context }) => {
    const baseline = await baselineRepository.cancel({
      baselineId: input.baselineId,
      comment: input.comment,
      actorAgentId: context.agentId,
    });
    return Result.ok({ baseline });
  },
});
