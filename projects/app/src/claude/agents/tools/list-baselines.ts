import { z } from "zod";

import { baselineRepository } from "../../../data/repositories/baselines";
import { defineTool } from "./__shared__/define-tool";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const listBaselinesTool = defineTool({
  name: "list_baselines",
  description: "List recent Situ baselines.",
  roles: allRoles,
  inputSchema,
  handler: async ({ input }) => ({
    baselines: await baselineRepository.list({
      limit: input.limit ?? 10,
    }),
  }),
});
