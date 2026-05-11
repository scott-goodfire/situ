import { z } from "zod";

import { computeTargetRepository } from "../../../data/repositories/compute-targets";
import { defineTool } from "./__shared__/define-tool";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  pool: z.string().describe("Optional compute pool name.").optional(),
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const listComputeTargetsTool = defineTool({
  name: "list_compute_targets",
  description: "List registered compute targets, optionally scoped to one pool.",
  roles: allRoles,
  inputSchema,
  handler: async ({ input }) => ({
    computeTargets: await computeTargetRepository.list({
      pool: input.pool,
      limit: input.limit ?? 10,
    }),
  }),
});
