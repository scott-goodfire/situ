import { z } from "zod";

import { PreconditionError } from "../../../data/repositories/__shared__";
import { createOrUpdateProjectBaseline } from "../../../runtime/project-baselines";
import { researchProjectRepository } from "@situ/research-projects";
import { defineTool } from "./define-tool";
import { Result } from "@situ/agent-tools";
import { toolContextModule } from "./__shared__/tool-context-module";

const inputSchema = z.object({
  researchProjectId: z
    .string()
    .describe("ResearchProject id. Defaults to the active ResearchProject work item.")
    .optional(),
  title: z.string().describe("Natural human project baseline title, usually 5-14 words."),
  summary: z
    .string()
    .describe(
      "Compact setup baseline shown to the user for approval. Include the metric, native command or evaluation path, assumptions, constraints, and what future results will compare against.",
    ),
  metric: z.string().describe("Optional primary metric or success signal.").optional(),
  command: z
    .string()
    .describe("Optional native command or evaluation workflow the baseline depends on.")
    .optional(),
  evaluationPlan: z
    .string()
    .describe(
      "Optional concise explanation of how future work should be compared to this baseline.",
    )
    .optional(),
  assumptions: z
    .array(z.string())
    .describe("Optional setup assumptions the user should approve or correct.")
    .optional(),
  constraints: z
    .array(z.string())
    .describe("Optional constraints that keep future research comparable to the baseline.")
    .optional(),
});

export const createProjectBaselineTool = defineTool({
  name: "create_project_baseline",
  description:
    "Create or revise the Manager-owned setup baseline for a ResearchProject before asking the user for baseline confirmation.",
  roles: ["manager"],
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input, context }) => {
    const researchProjectId = toolContextModule.researchProjectId({
      explicit: input.researchProjectId,
      context,
    });
    const project = await researchProjectRepository.require({ researchProjectId });
    if (project.phase !== "onboarding" && project.phase !== "baseline") {
      throw new PreconditionError({
        code: "wrong_project_phase",
        hint: `create_project_baseline is only available during onboarding or baseline phase. Current phase is ${project.phase}.`,
        details: { researchProjectId, currentPhase: project.phase },
      });
    }
    if (["complete", "failed", "canceled"].includes(project.status)) {
      throw new PreconditionError({
        code: "research_project_terminal",
        hint: "create_project_baseline cannot update a terminal ResearchProject. Open a new ResearchProject if the baseline needs to change.",
        details: { researchProjectId, currentStatus: project.status },
      });
    }

    const baseline = await createOrUpdateProjectBaseline({
      researchProjectId,
      title: input.title,
      summary: input.summary,
      createdByAgentId: context.agentId,
      payload: {
        baselineKind: "project_setup",
        metric: input.metric,
        command: input.command,
        evaluationPlan: input.evaluationPlan,
        assumptions: input.assumptions ?? [],
        constraints: input.constraints ?? [],
        createdByClaudeAgentRunId: context.claudeAgentRunId,
      },
    });
    return Result.ok({
      baseline,
      researchProject: await researchProjectRepository.require({ researchProjectId }),
      instruction:
        "Project baseline saved. Present this baseline for confirmation before creating ResearchTasks.",
    });
  },
});
