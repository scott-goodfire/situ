import { z } from "zod";

import { baselineRepository } from "@situ/research-records";
import { researchTaskRepository } from "../../../data/repositories/research-tasks";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { toolContextModule } from "./__shared__/tool-context-module";

const inputSchema = z.object({
  title: z.string().describe("Natural human baseline title, usually 5-14 words."),
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

export const createBaselineTool = defineTool({
  name: "create_baseline",
  description: "Create a durable baseline record for Scientist work.",
  roles: ["scientist"],
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input, context }) => {
    const researchTaskId = toolContextModule.requiredResearchTaskId({
      explicit: input.researchTaskId,
      context,
    });
    const task = await researchTaskRepository.require({ researchTaskId });
    return Result.ok({
      baseline: await baselineRepository.create({
        researchProjectId: task.researchProjectId,
        title: input.title,
        summary: input.summary,
        createdByResearchTaskId: researchTaskId,
        createdByAgentId: context.agentId,
      }),
    });
  },
});
