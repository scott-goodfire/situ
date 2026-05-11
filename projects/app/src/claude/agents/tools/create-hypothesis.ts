import { z } from "zod";

import { hypothesisRepository } from "../../../data/repositories/hypotheses";
import { defineTool } from "./__shared__/define-tool";
import { toolContextModule } from "./__shared__/tool-context-module";

const inputSchema = z.object({
  title: z.string().describe("Natural human hypothesis title, usually 5-14 words."),
  summary: z
    .string()
    .describe(
      "Compact human-sounding summary note: ideal is 1-2 sentences plus a few bullets when useful, paragraph-sized max.",
    ),
  researchTaskId: z
    .string()
    .describe("Optional ResearchTask id. Defaults to the active ResearchTask.")
    .optional(),
});

export const createHypothesisTool = defineTool({
  name: "create_hypothesis",
  description:
    "Create a durable situ hypothesis record for Manager planning or Scientist explore work.",
  roles: ["manager", "scientist"],
  inputSchema,
  handler: async ({ input, context }) => ({
    hypothesis: await hypothesisRepository.create({
      title: input.title,
      summary: input.summary,
      createdByResearchTaskId: toolContextModule.researchTaskId({
        explicit: input.researchTaskId,
        context,
        required: false,
      }),
      createdByAgentId: context.agentId,
    }),
  }),
});
