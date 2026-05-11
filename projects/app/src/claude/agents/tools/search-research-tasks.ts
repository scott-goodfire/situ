import { z } from "zod";
import { RESEARCH_TASK_STATUSES, RESEARCH_TASK_TYPES } from "@situ/protocol";

import { researchTaskRepository } from "../../../data/repositories/research-tasks";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  query: z.string().describe("Optional search text.").optional(),
  status: z.enum(RESEARCH_TASK_STATUSES).describe("Optional ResearchTask status.").optional(),
  type: z.enum(RESEARCH_TASK_TYPES).describe("Optional ResearchTask type.").optional(),
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const searchResearchTasksTool = defineTool({
  name: "search_research_tasks",
  description:
    "Search ResearchTasks by id, project, type, status, title, prompts, result, or target.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      researchTasks: await researchTaskRepository.search({
        query: input.query,
        status: input.status,
        type: input.type,
        limit: input.limit ?? 20,
      }),
    }),
});
