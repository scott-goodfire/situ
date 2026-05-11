import { z } from "zod";

import { hypothesisRepository } from "../../../data/repositories/hypotheses";
import { defineTool } from "./__shared__/define-tool";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  hypothesisId: z.string().describe("Hypothesis id to read."),
});

export const getHypothesisTool = defineTool({
  name: "get_hypothesis",
  description: "Read one Situ hypothesis with its activity timeline.",
  roles: allRoles,
  inputSchema,
  handler: async ({ input }) => ({
    result: await hypothesisRepository.getWithActivities({
      hypothesisId: input.hypothesisId,
    }),
  }),
});
