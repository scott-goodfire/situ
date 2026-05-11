import { z } from "zod";

import { researchTaskRepository } from "../../../data/repositories/research-tasks";
import { defineTool } from "./__shared__/define-tool";
import { allRoles } from "./__shared__/roles";
import { toolContextModule } from "./__shared__/tool-context-module";

const inputSchema = z.object({
  researchTaskId: z
    .string()
    .describe("ResearchTask id. Defaults to the active ResearchTask if omitted.")
    .optional(),
});

export const getResearchTaskTool = defineTool({
  name: "get_research_task",
  description: "Read one ResearchTask.",
  roles: allRoles,
  inputSchema,
  handler: async ({ input, context }) => ({
    researchTask: await researchTaskRepository.require({
      researchTaskId: toolContextModule.requiredResearchTaskId({
        explicit: input.researchTaskId,
        context,
      }),
    }),
  }),
});
