import { z } from "zod";

import { researchProjectInteractionRepository } from "../../../data/repositories/research-project-interactions";
import { defineTool } from "./__shared__/define-tool";
import { toolContextModule } from "./__shared__/tool-context-module";

const inputSchema = z.object({
  researchProjectId: z
    .string()
    .describe("ResearchProject id. Defaults to the active ResearchProject work item.")
    .optional(),
  prompt: z.string().describe("One direct confirmation question shown to the user."),
  baselineSummary: z
    .string()
    .describe(
      "Compact human-sounding baseline, assumptions, and next-step summary: 1-2 sentences plus bullets when useful.",
    ),
  baselineId: z.string().describe("Optional durable baseline record id if one exists.").optional(),
});

export const presentBaselineForConfirmationTool = defineTool({
  name: "present_baseline_for_confirmation",
  description:
    "Create a durable user confirmation checkpoint when onboarding has a baseline, assumptions, and proposed next steps ready for approval.",
  roles: ["manager"],
  inputSchema,
  handler: async ({ input, context }) => {
    const interaction = await researchProjectInteractionRepository.create({
      researchProjectId: toolContextModule.researchProjectId({
        explicit: input.researchProjectId,
        context,
      }),
      kind: "baseline_confirmation",
      prompt: input.prompt,
      details: input.baselineSummary,
      createdByAgentId: context.agentId,
      payload: {
        baselineId: input.baselineId,
        createdByClaudeAgentRunId: context.claudeAgentRunId,
      },
    });
    return {
      interaction,
      instruction: "Confirmation recorded. Stop this turn and wait for the user decision.",
    };
  },
});
