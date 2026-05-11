import { z } from "zod";

import { hypothesisRepository } from "../../../data/repositories/hypotheses";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const listHypothesesTool = defineTool({
  name: "list_hypotheses",
  description: "List recent situ hypotheses.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      hypotheses: await hypothesisRepository.list({
        limit: input.limit ?? 10,
      }),
    }),
});
