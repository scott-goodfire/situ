import { z } from "zod";

import { computeTargetRepository } from "@situ/compute";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
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
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      computeTargets: await computeTargetRepository.list({
        pool: input.pool,
        limit: input.limit ?? 10,
      }),
    }),
});
