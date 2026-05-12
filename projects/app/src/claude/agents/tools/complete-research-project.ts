import { z } from "zod";

import { PreconditionError } from "../../../data/repositories/__shared__";
import { researchProjectInteractionRepository } from "@situ/research-projects";
import { researchProjectRepository } from "@situ/research-projects";
import { researchTaskRepository } from "@situ/research-projects";
import { defineTool } from "./define-tool";
import { Result } from "@situ/agent-tools";
import { toolContextModule } from "./__shared__/tool-context-module";

const inputSchema = z.object({
  researchProjectId: z
    .string()
    .describe("ResearchProject id. Defaults to the active ResearchProject work item.")
    .optional(),
  resultSummary: z
    .string()
    .describe("Compact human-sounding completion summary: 1-2 sentences plus bullets when useful."),
});

export const completeResearchProjectTool = defineTool({
  name: "complete_research_project",
  description:
    "Mark the active ResearchProject done after verified evidence, durable next steps, or final results exist.",
  roles: ["manager"],
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input, context }) => {
    const researchProjectId = toolContextModule.researchProjectId({
      explicit: input.researchProjectId,
      context,
    });
    await assertResearchProjectCanComplete({ researchProjectId });
    const researchProject = await researchProjectRepository.transition({
      researchProjectId,
      status: "complete",
      resultSummary: input.resultSummary,
    });
    return Result.ok({ researchProject });
  },
});

async function assertResearchProjectCanComplete({
  researchProjectId,
}: {
  researchProjectId: string;
}): Promise<void> {
  const project = await researchProjectRepository.require({ researchProjectId });
  const interactions = await researchProjectInteractionRepository.listByResearchProject({
    researchProjectId,
    limit: 50,
  });
  const pendingInteraction = interactions.find((interaction) => interaction.status === "pending");
  if (pendingInteraction) {
    throw new PreconditionError({
      code: "complete_research_project_blocked_pending_interaction",
      hint: "Resolve or cancel the pending user interaction before completing the ResearchProject.",
      details: {
        researchProjectId,
        pendingInteractionId: pendingInteraction.id,
      },
    });
  }
  if (project.phase === "onboarding" || project.phase === "baseline") {
    throw new PreconditionError({
      code: "wrong_project_phase",
      hint: `complete_research_project is unavailable until baseline confirmation. Current phase is ${project.phase}. Use create_project_baseline and present_baseline_for_confirmation to advance the project.`,
      details: { researchProjectId, currentPhase: project.phase },
    });
  }

  const tasks = await researchTaskRepository.listByResearchProject({
    researchProjectId,
    limit: 100,
  });
  const inFlightTasks = tasks.filter(
    (task) => task.status === "running" || task.status === "awaiting_verification",
  );
  if (inFlightTasks.length > 0) {
    throw new PreconditionError({
      code: "complete_research_project_blocked_by_in_flight_tasks",
      hint: `Wait for ${inFlightTasks.length} in-flight ResearchTask(s) (running or awaiting_verification) to settle, or cancel/fail them, before completing the ResearchProject.`,
      details: {
        researchProjectId,
        inFlightTaskIds: inFlightTasks.map((task) => task.id),
      },
    });
  }
  const hasVerifiedEvidence = tasks.some((task) => task.status === "verified");
  if (!hasVerifiedEvidence && project.phase !== "reporting") {
    throw new PreconditionError({
      code: "missing_verified_evidence",
      hint: "complete_research_project requires at least one verified ResearchTask, or reporting phase with final output. Continue search or advance to reporting first.",
      details: { researchProjectId, currentPhase: project.phase },
    });
  }
}
