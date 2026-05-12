import { z } from "zod";

import { evaluationRepository } from "@situ/research-records";
import { defineTool } from "./define-tool";
import { Result } from "@situ/agent-tools";
import { toolContextModule } from "./__shared__/tool-context-module";

const inputSchema = z.object({
  title: z.string().describe("Natural human evaluation title, usually 5-14 words."),
  summary: z
    .string()
    .describe(
      "Compact human-sounding summary note: ideal is 1-2 sentences plus a few bullets when useful, paragraph-sized max.",
    ),
  researchTaskId: z
    .string()
    .describe("Optional ResearchTask id. Defaults to the active ResearchTask.")
    .optional(),
  associatedBaselineId: z.string().describe("Optional baseline id.").optional(),
  associatedExperimentId: z.string().describe("Optional experiment id.").optional(),
});

export const createEvaluationTool = defineTool({
  name: "create_evaluation",
  description: "Create a durable evaluation record connected to baseline and experiment records.",
  roles: ["scientist"],
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input, context }) =>
    Result.ok({
      evaluation: await evaluationRepository.create({
        title: input.title,
        summary: input.summary,
        createdByResearchTaskId: toolContextModule.researchTaskId({
          explicit: input.researchTaskId,
          context,
          required: false,
        }),
        createdByAgentId: context.agentId,
        associatedBaselineId: input.associatedBaselineId,
        associatedExperimentId: input.associatedExperimentId,
      }),
    }),
});
