import { z } from "zod";
import { RESEARCH_STATUSES } from "@situ/protocol";

import { experimentRepository } from "@situ/research-records";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  query: z.string().describe("Optional search text.").optional(),
  status: z.enum(RESEARCH_STATUSES).describe("Optional experiment status.").optional(),
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const searchExperimentsTool = defineTool({
  name: "search_experiments",
  description:
    "Search situ experiments by id, title, summary, task id, primary hypothesis id, worktree, commit, or status.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      experiments: await experimentRepository.search({
        query: input.query,
        status: input.status,
        limit: input.limit ?? 10,
      }),
    }),
});
