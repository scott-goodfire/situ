import { z } from "zod";

import { experimentRepository } from "@situ/research-records";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { scienceRoles } from "./__shared__/roles";

const inputSchema = z.object({
  experimentId: z.string().describe("Experiment id to cancel."),
  comment: z.string().describe("Short transition comment explaining the decision."),
});

export const cancelExperimentTool = defineTool({
  name: "cancel_experiment",
  description: "Cancel an experiment with a transition comment.",
  roles: scienceRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input, context }) => {
    const experiment = await experimentRepository.cancel({
      experimentId: input.experimentId,
      comment: input.comment,
      actorAgentId: context.agentId,
    });
    return Result.ok({ experiment });
  },
});
