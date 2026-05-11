import { z } from "zod";

import { PreconditionError } from "../../../data/repositories/__shared__";
import { researchProjectInteractionRepository } from "../../../data/repositories/research-project-interactions";
import {
  researchProjectIsHeadless,
  researchProjectRepository,
} from "../../../data/repositories/research-projects";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
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
  resultEnvelope: true,
  handler: async ({ input, context }) => {
    const researchProjectId = toolContextModule.researchProjectId({
      explicit: input.researchProjectId,
      context,
    });
    const project = await researchProjectRepository.require({ researchProjectId });
    if (researchProjectIsHeadless({ project })) {
      throw new PreconditionError({
        code: "ask_user_question_blocked_headless",
        hint: "Proceed from the objective, repository evidence, and explicit assumptions, or call fail_research_project if no credible path exists. ask_user_question is unavailable for headless ResearchProjects.",
        details: { researchProjectId, headless: true },
      });
    }
    const interaction = await researchProjectInteractionRepository.create({
      researchProjectId,
      kind: "question",
      prompt: input.question,
      details: input.details ?? "",
      createdByAgentId: context.agentId,
      payload: { createdByClaudeAgentRunId: context.claudeAgentRunId },
    });
    return Result.ok({
      interaction,
      instruction: "Question recorded. Stop this turn and wait for the user response.",
    });
  },
});
