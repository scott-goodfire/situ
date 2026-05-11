import { z } from "zod";

import { researchProjectInteractionRepository } from "../../../data/repositories/research-project-interactions";
import { defineTool } from "./__shared__/define-tool";
import { toolContextModule } from "./__shared__/tool-context-module";

const inputSchema = z.object({
  researchProjectId: z
    .string()
    .describe("ResearchProject id. Defaults to the active ResearchProject work item.")
    .optional(),
  question: z
    .string()
    .describe("One concrete question the user can answer to unblock the Manager."),
  details: z
    .string()
    .describe("Optional one-sentence context explaining why the question matters.")
    .optional(),
});

export const askUserQuestionTool = defineTool({
  name: "ask_user_question",
  description:
    "Create one durable user-facing question when a ResearchProject is blocked on missing context or a decision.",
  roles: ["manager"],
  inputSchema,
  handler: async ({ input, context }) => {
    const interaction = await researchProjectInteractionRepository.create({
      researchProjectId: toolContextModule.researchProjectId({
        explicit: input.researchProjectId,
        context,
      }),
      kind: "question",
      prompt: input.question,
      details: input.details ?? "",
      createdByAgentId: context.agentId,
      payload: { createdByClaudeAgentRunId: context.claudeAgentRunId },
    });
    return {
      interaction,
      instruction: "Question recorded. Stop this turn and wait for the user response.",
    };
  },
});
