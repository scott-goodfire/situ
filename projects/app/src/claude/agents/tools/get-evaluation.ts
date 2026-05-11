import { z } from "zod";

import { evaluationRepository } from "../../../data/repositories/evaluations";
import { defineTool } from "./__shared__/define-tool";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  evaluationId: z.string().describe("Evaluation id to read."),
});

export const getEvaluationTool = defineTool({
  name: "get_evaluation",
  description: "Read one Situ evaluation with activities and measurements.",
  roles: allRoles,
  inputSchema,
  handler: async ({ input }) => ({
    result: await evaluationRepository.getWithActivities({
      evaluationId: input.evaluationId,
    }),
  }),
});
