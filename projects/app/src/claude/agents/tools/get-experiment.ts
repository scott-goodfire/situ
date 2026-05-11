import { z } from "zod";

import { experimentRepository } from "../../../data/repositories/experiments";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  experimentId: z.string().describe("Experiment id to read."),
});

export const getExperimentTool = defineTool({
  name: "get_experiment",
  description: "Read one situ experiment with its activity timeline.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      result: await experimentRepository.getWithActivities({
        experimentId: input.experimentId,
      }),
    }),
});
