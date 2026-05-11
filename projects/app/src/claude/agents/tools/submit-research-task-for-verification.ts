import { z } from "zod";

import { researchTaskRepository } from "../../../data/repositories/research-tasks";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { toolContextModule } from "./__shared__/tool-context-module";

const evidenceSummaryError =
  "evidenceSummary is required: provide 1-3 bullets citing the specific commands and artifacts that justify the verification, including full durable ids.";

const inputSchema = z.object({
  researchTaskId: z
    .string()
    .describe("ResearchTask id. Defaults to the active ResearchTask if omitted.")
    .optional(),
  workerSummary: z
    .string()
    .describe("Compact human-sounding worker summary: 1-2 sentences naming what changed."),
  evidenceSummary: z
    .string({ error: evidenceSummaryError })
    .min(1, { error: evidenceSummaryError })
    .describe(
      "Compact human-sounding evidence summary (required): 1-3 bullets citing the specific commands and artifacts that justify the verification, with full durable ids.",
    ),
});

export const submitResearchTaskForVerificationTool = defineTool({
  name: "submit_research_task_for_verification",
  description:
    "Submit the active ResearchTask worker result to a Verifier without claiming final success.",
  roles: ["scientist"],
  inputSchema,
  resultEnvelope: true,
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
    return Result.ok({
      researchTask,
      evidenceSummary: input.evidenceSummary,
    });
  },
});
