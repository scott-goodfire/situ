import { z } from "zod";
import { RESEARCH_STATUSES } from "@situ/protocol";

import { evaluationRepository } from "../../../data/repositories/evaluations";
import { defineTool } from "./__shared__/define-tool";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  query: z.string().describe("Optional search text.").optional(),
  status: z.enum(RESEARCH_STATUSES).describe("Optional evaluation status.").optional(),
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const searchEvaluationsTool = defineTool({
  name: "search_evaluations",
  description:
    "Search Situ evaluations by id, title, summary, associated record, task id, or status.",
  roles: allRoles,
  inputSchema,
  handler: async ({ input }) => ({
    evaluations: await evaluationRepository.search({
      query: input.query,
      status: input.status,
      limit: input.limit ?? 10,
    }),
  }),
});
