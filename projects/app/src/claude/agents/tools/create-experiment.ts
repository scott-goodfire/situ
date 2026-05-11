import { z } from "zod";

import { PreconditionError } from "../../../data/repositories/__shared__";
import { experimentRepository } from "../../../data/repositories/experiments";
import { researchTaskRepository } from "../../../data/repositories/research-tasks";
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
      "Required when creating a child experiment that deepens a verified parent. The experiment worktree starts from the parent candidate commit when available.",
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
    const associatedHypothesisId =
      input.associatedHypothesisId ??
      (await associatedHypothesisIdFromResearchTask({ researchTaskId })) ??
      (await associatedHypothesisIdFromParentExperiment({
        parentExperimentId: input.parentExperimentId,
      }));
    if (!associatedHypothesisId) {
      throw new PreconditionError({
        code: "missing_associated_hypothesis",
        hint: "Pass associatedHypothesisId explicitly, or run from a hypothesis-targeted ResearchTask, or include parentExperimentId so the hypothesis can be inherited. Every Experiment must test one primary Hypothesis.",
        details: {
          researchTaskId,
          parentExperimentId: input.parentExperimentId,
        },
      });
    }
    return Result.ok({
      experiment: await experimentRepository.create({
        title: input.title,
        summary: input.summary,
        createdByResearchTaskId: researchTaskId,
        createdByAgentId: context.agentId,
        associatedHypothesisId,
        parentExperimentId: input.parentExperimentId,
      }),
    });
  },
});

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
