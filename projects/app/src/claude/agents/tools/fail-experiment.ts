import { z } from "zod";

import { experimentRepository } from "../../../data/repositories/experiments";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { scienceRoles } from "./__shared__/roles";

const inputSchema = z.object({
  experimentId: z.string().describe("Experiment id to fail."),
  comment: z.string().describe("Short transition comment explaining the decision."),
});

export const failExperimentTool = defineTool({
  name: "fail_experiment",
  description: "Mark an experiment failed with a transition comment.",
  roles: scienceRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input, context }) => {
    const experiment = await experimentRepository.fail({
      experimentId: input.experimentId,
      comment: input.comment,
      actorAgentId: context.agentId,
    });
    return Result.ok({ experiment });
  },
});
