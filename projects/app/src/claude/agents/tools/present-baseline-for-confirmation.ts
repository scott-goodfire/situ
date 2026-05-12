import { z } from "zod";

import { PreconditionError } from "../../../data/repositories/__shared__";
import { baselineRepository } from "@situ/research-records";
import { researchProjectInteractionRepository } from "@situ/research-projects";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { toolContextModule } from "./__shared__/tool-context-module";

const inputSchema = z.object({
  researchProjectId: z
    .string()
    .describe("ResearchProject id. Defaults to the active ResearchProject work item.")
    .optional(),
  prompt: z.string().describe("One direct confirmation question shown to the user."),
  baselineId: z
    .string()
    .describe("Durable project baseline id created by create_project_baseline."),
});

export const presentBaselineForConfirmationTool = defineTool({
  name: "present_baseline_for_confirmation",
  description:
    "Create a durable user confirmation checkpoint when onboarding has a baseline, assumptions, and proposed next steps ready for approval.",
  roles: ["manager"],
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input, context }) => {
    const researchProjectId = toolContextModule.researchProjectId({
      explicit: input.researchProjectId,
      context,
    });
    const baseline = await baselineRepository.require({ baselineId: input.baselineId });
    if (baseline.researchProjectId !== researchProjectId) {
      throw new PreconditionError({
        code: "baseline_project_mismatch",
        hint: "Pass the baselineId that was created for this ResearchProject. Create one with create_project_baseline if needed.",
        details: {
          baselineId: baseline.id,
          baselineResearchProjectId: baseline.researchProjectId,
          researchProjectId,
        },
      });
    }
    if (baseline.createdByResearchTaskId) {
      throw new PreconditionError({
        code: "baseline_not_manager_created",
        hint: "Create a Manager-owned project baseline with create_project_baseline before presenting it for confirmation. ResearchTask-created baselines are not eligible.",
        details: {
          baselineId: baseline.id,
          createdByResearchTaskId: baseline.createdByResearchTaskId,
        },
      });
    }
    const interaction = await researchProjectInteractionRepository.create({
      researchProjectId,
      kind: "baseline_confirmation",
      prompt: input.prompt,
      details: baseline.summary,
      createdByAgentId: context.agentId,
      payload: {
        baselineId: baseline.id,
        createdByClaudeAgentRunId: context.claudeAgentRunId,
      },
    });
    return Result.ok({
      interaction,
      instruction: "Confirmation recorded. Stop this turn and wait for the user decision.",
    });
  },
});
