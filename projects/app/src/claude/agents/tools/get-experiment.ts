import { z } from "zod";

import { experimentRepository } from "@situ/research-records";
import { defineTool } from "./define-tool";
import { Result } from "@situ/agent-tools";
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
