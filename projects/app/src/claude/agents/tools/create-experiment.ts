import { z } from "zod";

import { PreconditionError } from "../../../data/repositories/__shared__";
import { experimentRepository } from "@situ/research-records";
import { researchTaskRepository } from "@situ/research-projects";
import { jsonModule } from "../../../modules/json";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { toolContextModule } from "./__shared__/tool-context-module";

const inputSchema = z.object({
  title: z.string().describe("Natural human experiment title, usually 5-14 words."),
  summary: z
    .string()
    .describe(
      "Compact human-sounding summary note: ideal is 1-2 sentences plus a few bullets when useful, paragraph-sized max.",
    ),
  researchTaskId: z
    .string()
    .describe("Optional ResearchTask id. Defaults to the active ResearchTask.")
    .optional(),
  associatedHypothesisId: z
    .string()
    .describe(
      "Required unless it can default from a hypothesis-targeted ResearchTask or the parent experiment. Primary hypothesis id this experiment tests.",
    )
    .optional(),
  parentExperimentId: z
    .string()
    .describe(
      "Optional override. Normally inherited from the active ResearchTask's parentExperimentId (set by the Manager at create_research_task time). Set explicitly only when overriding inheritance.",
    )
    .optional(),
});

export const createExperimentTool = defineTool({
  name: "create_experiment",
  description: "Create a durable experiment record for Scientist work.",
  roles: ["scientist"],
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input, context }) => {
    const researchTaskId = toolContextModule.researchTaskId({
      explicit: input.researchTaskId,
      context,
      required: false,
    });
    const parentExperimentId =
      input.parentExperimentId ?? (await parentExperimentIdFromResearchTask({ researchTaskId }));
    const associatedHypothesisId =
      input.associatedHypothesisId ??
      (await associatedHypothesisIdFromResearchTask({ researchTaskId })) ??
      (await associatedHypothesisIdFromParentExperiment({ parentExperimentId }));
    if (!associatedHypothesisId) {
      throw new PreconditionError({
        code: "missing_associated_hypothesis",
        hint: "Pass associatedHypothesisId explicitly, or run from a hypothesis-targeted ResearchTask, or include parentExperimentId so the hypothesis can be inherited. Every Experiment must test one primary Hypothesis.",
        details: { researchTaskId, parentExperimentId },
      });
    }
    return Result.ok({
      experiment: await experimentRepository.create({
        title: input.title,
        summary: input.summary,
        createdByResearchTaskId: researchTaskId,
        createdByAgentId: context.agentId,
        associatedHypothesisId,
        parentExperimentId,
      }),
    });
  },
});

async function parentExperimentIdFromResearchTask({
  researchTaskId,
}: {
  researchTaskId?: string;
}): Promise<string | undefined> {
  if (!researchTaskId) {
    return undefined;
  }
  const researchTask = await researchTaskRepository.require({ researchTaskId });
  const payload = jsonModule.parseRecord({ raw: researchTask.payloadJson });
  const value = payload.parentExperimentId;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

async function associatedHypothesisIdFromResearchTask({
  researchTaskId,
}: {
  researchTaskId?: string;
}): Promise<string | undefined> {
  if (!researchTaskId) {
    return undefined;
  }
  const researchTask = await researchTaskRepository.require({ researchTaskId });
  return researchTask.targetKind === "hypothesis"
    ? (researchTask.targetId ?? undefined)
    : undefined;
}

async function associatedHypothesisIdFromParentExperiment({
  parentExperimentId,
}: {
  parentExperimentId?: string;
}): Promise<string | undefined> {
  if (!parentExperimentId) {
    return undefined;
  }
  const parentExperiment = await experimentRepository.require({ experimentId: parentExperimentId });
  return parentExperiment.associatedHypothesisId;
}
