import { z } from "zod";

import { experimentRepository } from "@situ/research-records";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const listExperimentsTool = defineTool({
  name: "list_experiments",
  description: "List recent situ experiments.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      experiments: await experimentRepository.list({
        limit: input.limit ?? 10,
      }),
    }),
});
