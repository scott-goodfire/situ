import { z } from "zod";

import { baselineRepository } from "@situ/research-records";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  baselineId: z.string().describe("Baseline id to read."),
});

export const getBaselineTool = defineTool({
  name: "get_baseline",
  description: "Read one situ baseline with its activity timeline.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      result: await baselineRepository.getWithActivities({
        baselineId: input.baselineId,
      }),
    }),
});
