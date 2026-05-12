import { z } from "zod";

import { baselineRepository } from "@situ/research-records";
import { defineTool } from "./define-tool";
import { Result } from "@situ/agent-tools";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const listBaselinesTool = defineTool({
  name: "list_baselines",
  description: "List recent situ baselines.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      baselines: await baselineRepository.list({
        limit: input.limit ?? 10,
      }),
    }),
});
