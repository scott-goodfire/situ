import { z } from "zod";

import { researchTaskRepository } from "../../../data/repositories/research-tasks";
import { defineTool } from "./__shared__/define-tool";
import { toolContextModule } from "./__shared__/tool-context-module";

const inputSchema = z.object({
  researchTaskId: z
    .string()
    .describe("ResearchTask id. Defaults to the active ResearchTask if omitted.")
    .optional(),
  resultSummary: z
    .string()
    .describe("Compact human-sounding failure summary: 1-2 sentences plus bullets when useful."),
});

export const failResearchTaskTool = defineTool({
  name: "fail_research_task",
  description: "Mark the active ResearchTask failed with a durable failure summary.",
  roles: ["scientist"],
  inputSchema,
  handler: async ({ input, context }) => ({
    researchTask: await researchTaskRepository.transition({
      researchTaskId: toolContextModule.requiredResearchTaskId({
        explicit: input.researchTaskId,
        context,
      }),
      status: "failed",
      resultSummary: input.resultSummary,
    }),
  }),
});
