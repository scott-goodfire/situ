import { z } from "zod";

import { evaluationRepository } from "@situ/research-records";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const listEvaluationsTool = defineTool({
  name: "list_evaluations",
  description: "List recent situ evaluations.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      evaluations: await evaluationRepository.list({
        limit: input.limit ?? 10,
      }),
    }),
});
