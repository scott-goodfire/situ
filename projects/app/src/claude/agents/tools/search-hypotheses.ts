import { z } from "zod";
import { RESEARCH_STATUSES } from "@situ/protocol";

import { hypothesisRepository } from "@situ/research-records";
import { defineTool } from "./define-tool";
import { Result } from "@situ/agent-tools";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  query: z.string().describe("Optional search text.").optional(),
  status: z.enum(RESEARCH_STATUSES).describe("Optional hypothesis status.").optional(),
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const searchHypothesesTool = defineTool({
  name: "search_hypotheses",
  description: "Search situ hypotheses by id, title, summary, or status.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      hypotheses: await hypothesisRepository.search({
        query: input.query,
        status: input.status,
        limit: input.limit ?? 10,
      }),
    }),
});
