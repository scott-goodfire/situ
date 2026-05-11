import { z } from "zod";

import { researchTaskRepository } from "../../../data/repositories/research-tasks";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const listResearchTasksTool = defineTool({
  name: "list_research_tasks",
  description: "List recent ResearchTasks.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      researchTasks: await researchTaskRepository.list({
        limit: input.limit ?? 20,
      }),
    }),
});
