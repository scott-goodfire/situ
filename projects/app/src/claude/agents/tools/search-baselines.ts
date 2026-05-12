import { z } from "zod";
import { RESEARCH_STATUSES } from "@situ/protocol";

import { baselineRepository } from "@situ/research-records";
import { defineTool } from "./define-tool";
import { Result } from "@situ/agent-tools";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  query: z.string().describe("Optional search text.").optional(),
  status: z.enum(RESEARCH_STATUSES).describe("Optional baseline status.").optional(),
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const searchBaselinesTool = defineTool({
  name: "search_baselines",
  description: "Search situ baselines by id, title, summary, task id, or status.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      baselines: await baselineRepository.search({
        query: input.query,
        status: input.status,
        limit: input.limit ?? 10,
      }),
    }),
});
