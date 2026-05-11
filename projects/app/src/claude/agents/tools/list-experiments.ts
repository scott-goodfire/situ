import { z } from "zod";

import { experimentRepository } from "../../../data/repositories/experiments";
import { defineTool } from "./__shared__/define-tool";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const listExperimentsTool = defineTool({
  name: "list_experiments",
  description: "List recent situ experiments.",
  roles: allRoles,
  inputSchema,
  handler: async ({ input }) => ({
    experiments: await experimentRepository.list({
      limit: input.limit ?? 10,
    }),
  }),
});
