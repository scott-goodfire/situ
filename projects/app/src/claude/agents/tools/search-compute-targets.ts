import { z } from "zod";
import { COMPUTE_TARGET_STATUSES } from "@situ/protocol";

import { computeTargetRepository } from "../../../data/repositories/compute-targets";
import { defineTool } from "./__shared__/define-tool";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  pool: z.string().describe("Optional compute pool name.").optional(),
  status: z.enum(COMPUTE_TARGET_STATUSES).describe("Optional compute target status.").optional(),
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const searchComputeTargetsTool = defineTool({
  name: "search_compute_targets",
  description:
    "Search registered compute targets by pool and status without claiming or mutating leases.",
  roles: allRoles,
  inputSchema,
  handler: async ({ input }) => ({
    computeTargets: await computeTargetRepository.search({
      pool: input.pool,
      status: input.status,
      limit: input.limit ?? 10,
    }),
  }),
});
