import { z } from "zod";

import { researchTaskRepository } from "../../../data/repositories/research-tasks";
import { defineTool } from "./__shared__/define-tool";
import { toolContextModule } from "./__shared__/tool-context-module";

const inputSchema = z.object({
  researchTaskId: z
    .string()
    .describe("ResearchTask id. Defaults to the active ResearchTask if omitted.")
    .optional(),
  workerSummary: z
    .string()
    .describe("Compact human-sounding worker summary: 1-2 sentences naming what changed."),
  evidenceSummary: z
    .string()
    .describe(
      "Compact human-sounding evidence summary: 1-3 bullets or sentences with full durable ids.",
    ),
});

export const submitResearchTaskForVerificationTool = defineTool({
  name: "submit_research_task_for_verification",
  description:
    "Submit the active ResearchTask worker result to a Verifier without claiming final success.",
  roles: ["scientist"],
  inputSchema,
  handler: async ({ input, context }) => {
    const researchTaskId = toolContextModule.requiredResearchTaskId({
      explicit: input.researchTaskId,
      context,
    });
    const researchTask = await researchTaskRepository.transition({
      researchTaskId,
      status: "awaiting_verification",
      resultSummary: `${input.workerSummary}\n\nEvidence summary:\n${input.evidenceSummary}`,
    });
    return {
      researchTask,
      evidenceSummary: input.evidenceSummary,
    };
  },
});
