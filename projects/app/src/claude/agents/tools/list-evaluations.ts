import { z } from "zod";

import { evaluationRepository } from "../../../data/repositories/evaluations";
import { defineTool } from "./__shared__/define-tool";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const listEvaluationsTool = defineTool({
  name: "list_evaluations",
  description: "List recent Situ evaluations.",
  roles: allRoles,
  inputSchema,
  handler: async ({ input }) => ({
    evaluations: await evaluationRepository.list({
      limit: input.limit ?? 10,
    }),
  }),
});
