import { z } from "zod";

import { researchProjectRepository } from "../../../data/repositories/research-projects";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { toolContextModule } from "./__shared__/tool-context-module";

const inputSchema = z.object({
  researchProjectId: z
    .string()
    .describe("ResearchProject id. Defaults to the active ResearchProject work item.")
    .optional(),
  resultSummary: z
    .string()
    .describe("Compact human-sounding failure summary: 1-2 sentences plus bullets when useful."),
});

export const failResearchProjectTool = defineTool({
  name: "fail_research_project",
  description:
    "Mark the active ResearchProject failed when it cannot proceed and a durable failure reason is available.",
  roles: ["manager"],
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input, context }) => {
    const researchProject = await researchProjectRepository.transition({
      researchProjectId: toolContextModule.researchProjectId({
        explicit: input.researchProjectId,
        context,
      }),
      status: "failed",
      resultSummary: input.resultSummary,
    });
    return Result.ok({ researchProject });
  },
});
