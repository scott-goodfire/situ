import { z } from "zod";

import { experimentRepository } from "../../../data/repositories/experiments";
import { defineTool } from "./__shared__/define-tool";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  experimentId: z.string().describe("Experiment id to read."),
});

export const getExperimentTool = defineTool({
  name: "get_experiment",
  description: "Read one situ experiment with its activity timeline.",
  roles: allRoles,
  inputSchema,
  handler: async ({ input }) => ({
    result: await experimentRepository.getWithActivities({
      experimentId: input.experimentId,
    }),
  }),
});
