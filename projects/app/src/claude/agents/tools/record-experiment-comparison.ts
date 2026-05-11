import { z } from "zod";

import { evaluationRepository } from "../../../data/repositories/evaluations";
import { defineTool } from "./__shared__/define-tool";
import { toolContextModule } from "./__shared__/tool-context-module";

const inputSchema = z.object({
  baselineId: z.string().describe("Baseline id for the current behavior."),
  experimentId: z.string().describe("Experiment id with a captured candidate commit."),
  title: z.string().describe("Natural human comparison title, usually 5-14 words."),
  summary: z
    .string()
    .describe(
      "Compact human-sounding summary note: ideal is 1-2 sentences plus a few bullets when useful, paragraph-sized max.",
    ),
  body: z
    .string()
    .describe("Compact human-sounding comparison outcome. Include key numbers and verdict."),
  researchTaskId: z
    .string()
    .describe("Optional ResearchTask id. Defaults to the active ResearchTask.")
    .optional(),
  command: z.string().describe("Optional command used for comparison.").optional(),
  baselineOutput: z
    .string()
    .describe("Optional baseline command output or observation.")
    .optional(),
  candidateOutput: z
    .string()
    .describe("Optional candidate command output or observation.")
    .optional(),
  payload: z
    .record(z.string(), z.unknown())
    .describe("Optional structured comparison payload.")
    .optional(),
});

export const recordExperimentComparisonTool = defineTool({
  name: "record_experiment_comparison",
  description:
    "Create an evaluation and measurement comparing a baseline to a captured experiment candidate.",
  roles: ["scientist"],
  inputSchema,
  handler: async ({ input, context }) => ({
    comparison: await evaluationRepository.recordExperimentComparison({
      baselineId: input.baselineId,
      experimentId: input.experimentId,
      title: input.title,
      summary: input.summary,
      body: input.body,
      createdByResearchTaskId: toolContextModule.researchTaskId({
        explicit: input.researchTaskId,
        context,
        required: false,
      }),
      createdByAgentId: context.agentId,
      command: input.command,
      baselineOutput: input.baselineOutput,
      candidateOutput: input.candidateOutput,
      payload: input.payload ?? {},
    }),
  }),
});
