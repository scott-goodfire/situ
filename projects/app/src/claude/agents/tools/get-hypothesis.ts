import { z } from "zod";

import { hypothesisRepository } from "@situ/research-records";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  hypothesisId: z.string().describe("Hypothesis id to read."),
});

export const getHypothesisTool = defineTool({
  name: "get_hypothesis",
  description: "Read one situ hypothesis with its activity timeline.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      result: await hypothesisRepository.getWithActivities({
        hypothesisId: input.hypothesisId,
      }),
    }),
});
