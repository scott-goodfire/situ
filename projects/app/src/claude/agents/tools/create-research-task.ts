import { z } from "zod";
import { RESEARCH_TASK_PRIORITIES, RESEARCH_TASK_TYPES } from "@situ/protocol";

import { computeTargetRepository, DEFAULT_LOCAL_COMPUTE_POOL } from "@situ/compute";
import { PreconditionError } from "../../../data/repositories/__shared__";
import { experimentRepository } from "@situ/research-records";
import { researchProjectRepository } from "@situ/research-projects";
import { researchTaskRepository } from "@situ/research-projects";
import { defineTool } from "./define-tool";
import { findExploitShapeTokens } from "./__shared__/explore-task-shape";
import { Result } from "@situ/agent-tools";
import { toolContextModule } from "./__shared__/tool-context-module";
import { ENTITY_KINDS, toolEntityReferenceModule } from "./__shared__/tool-entity-reference-module";

const READ_ONLY_TASK_TYPES = new Set(["explore", "synthesize", "prune"]);
const PARENT_INHERITING_TASK_TYPES = new Set(["exploit", "debug"]);

const inputSchema = z
  .object({
    researchProjectId: z
      .string()
      .describe("ResearchProject id. Defaults to the active ResearchProject work item.")
      .optional(),
    title: z.string().describe("Natural human action title, usually 5-14 words."),
    type: z.enum(RESEARCH_TASK_TYPES).describe("Search-policy task type selected by the Manager."),
    workerPrompt: z
      .string()
      .describe(
        "Compact worker checklist for one bounded task, usually 3-5 bullets or short sentences. For explore/exploit/debug/synthesize/prune tasks this is the Scientist assignment. For type verify this is the Verifier assignment. Include exact ids, files, metric, and expected durable outputs. Use separate ResearchTasks for independent exploit variants. When deepening a verified experiment, include the parent experiment id and require the Scientist to create the child Experiment with parentExperimentId.",
      ),
    verificationPrompt: z
      .string()
      .describe(
        "Compact Verifier checklist, usually 2-4 checks. Name required evidence, invalidators, and comparison target. For deepening work, reject a missing or wrong parentExperimentId.",
      ),
    priority: z.enum(RESEARCH_TASK_PRIORITIES).describe("ResearchTask priority.").optional(),
    parentResearchTaskId: z.string().describe("Optional parent ResearchTask id.").optional(),
    targetKind: z
      .enum(ENTITY_KINDS)
      .describe(
        'Optional durable entity kind this ResearchTask targets. Required as "hypothesis" for exploit tasks.',
      )
      .optional(),
    targetId: z
      .string()
      .describe("Optional durable entity id this ResearchTask targets. Required for exploit tasks.")
      .optional(),
    parentExperimentId: z
      .string()
      .describe(
        "Parent experiment id when this task deepens a verified lineage. Only valid for type 'exploit' or 'debug'. The tool validates the parent has a captured candidateCommit at plan time and the Scientist's create_experiment inherits it automatically — do not repeat the id in workerPrompt.",
      )
      .optional(),
    computePool: z
      .string()
      .trim()
      .min(1)
      .describe(
        "Optional registered compute pool when the workerPrompt requires compute. Use search_compute_targets first; this tool rejects pools with no active target.",
      )
      .optional(),
  })
  .refine((input) => Boolean(input.targetKind) === Boolean(input.targetId), {
    message: "targetKind and targetId must be provided together.",
    path: ["targetId"],
  })
  .superRefine((input, context) => {
    if (input.type === "exploit" && input.targetKind !== "hypothesis") {
      context.addIssue({
        code: "custom",
        path: ["targetKind"],
        message:
          'exploit ResearchTasks must target an existing hypothesis with targetKind: "hypothesis" and targetId. Create an explore task first if no hypothesis exists.',
      });
    }
    if (input.type === "verify" && input.computePool) {
      context.addIssue({
        code: "custom",
        path: ["computePool"],
        message:
          "computePool applies only to Scientist-routed ResearchTasks; type verify is routed directly to Verifier.",
      });
    }
    if (input.parentExperimentId && !PARENT_INHERITING_TASK_TYPES.has(input.type)) {
      context.addIssue({
        code: "custom",
        path: ["parentExperimentId"],
        message: `parentExperimentId is only valid for type 'exploit' or 'debug' (got '${input.type}'). Drop the field or change the type.`,
      });
    }
  });

export const createResearchTaskTool = defineTool({
  name: "create_research_task",
  description:
    "Create a ResearchTask with workerPrompt assignment prose and Verifier verificationPrompt acceptance criteria.",
  roles: ["manager"],
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input, context }) => {
    const researchProjectId = toolContextModule.researchProjectId({
      explicit: input.researchProjectId,
      context,
    });
    const project = await researchProjectRepository.require({ researchProjectId });
    if (project.phase !== "search") {
      throw new PreconditionError({
        code: "wrong_project_phase",
        hint: `create_research_task is only available after the project baseline is confirmed and the project is in search phase. Current phase is ${project.phase}. Use create_project_baseline and present_baseline_for_confirmation to get the project to search phase first.`,
        details: { researchProjectId, currentPhase: project.phase },
      });
    }
    if (READ_ONLY_TASK_TYPES.has(input.type)) {
      const matchedTokens = findExploitShapeTokens({ workerPrompt: input.workerPrompt });
      if (matchedTokens.length > 0) {
        throw new PreconditionError({
          code: "read_only_task_prompt_has_exploit_shape",
          hint: `The workerPrompt names exploit-shape verbs/tools (${matchedTokens.join(", ")}), but ${input.type} ResearchTasks cannot run candidate commands. Recreate the task with type: 'exploit' (and a hypothesis targetId), or rewrite the workerPrompt to read-only work if the type should remain ${input.type}.`,
          details: { matchedTokens, taskType: input.type, suggestedType: "exploit" },
        });
      }
    }
    if (input.parentExperimentId) {
      const parentExperiment = await experimentRepository.get({
        experimentId: input.parentExperimentId,
      });
      if (!parentExperiment) {
        throw new PreconditionError({
          code: "parent_experiment_not_found",
          hint: `parentExperimentId ${input.parentExperimentId} does not match any existing experiment. Use search_experiments to find a verified deepening parent.`,
          details: { parentExperimentId: input.parentExperimentId, taskType: input.type },
        });
      }
      if (!parentExperiment.candidateCommit) {
        throw new PreconditionError({
          code: "parent_experiment_missing_candidate_commit",
          hint: `parentExperimentId ${input.parentExperimentId} has no captured candidateCommit. The Scientist cannot inherit from a parent that never captured its commit. Choose a different parent (most recent verified experiment with a captured candidate), or wait for the parent to finish capturing.`,
          details: { parentExperimentId: input.parentExperimentId, taskType: input.type },
        });
      }
    }
    if (input.targetKind && input.targetId) {
      await toolEntityReferenceModule.assertExists({
        kind: input.targetKind,
        id: input.targetId,
      });
    }
    const computePool = scientistComputePool({ type: input.type, computePool: input.computePool });
    if (computePool && computePool !== DEFAULT_LOCAL_COMPUTE_POOL) {
      await assertComputePoolExists({ pool: computePool });
    }
    const payload: Record<string, unknown> = {
      createdByClaudeAgentRunId: context.claudeAgentRunId,
    };
    if (computePool) {
      payload.compute = { pool: computePool };
    }
    if (input.parentExperimentId) {
      payload.parentExperimentId = input.parentExperimentId;
    }
    const researchTask = await researchTaskRepository.create({
      researchProjectId,
      type: input.type,
      title: input.title,
      workerPrompt: input.workerPrompt,
      verificationPrompt: input.verificationPrompt,
      priority: input.priority,
      parentResearchTaskId: input.parentResearchTaskId,
      targetKind: input.targetKind,
      targetId: input.targetId,
      createdByAgentId: context.agentId,
      payload,
    });
    return Result.ok({ researchTask });
  },
});

function scientistComputePool({
  type,
  computePool,
}: {
  type: string;
  computePool?: string;
}): string | undefined {
  if (type === "verify") {
    return undefined;
  }
  return computePool ?? DEFAULT_LOCAL_COMPUTE_POOL;
}

async function assertComputePoolExists({ pool }: { pool: string }): Promise<void> {
  const targets = await computeTargetRepository.listAll();
  const activeTargets = targets.filter((target) => target.status !== "dead");
  if (activeTargets.some((target) => target.pool === pool)) {
    return;
  }
  const availablePools = Array.from(new Set(activeTargets.map((target) => target.pool))).sort();
  throw new PreconditionError({
    code: "compute_pool_unknown",
    hint: `computePool "${pool}" is not registered. ${availablePools.length ? `Available compute pools: ${availablePools.join(", ")}.` : "No compute pools are registered."} Register compute when launching a fresh run with situ exec --compute-pool ${pool}.`,
    details: { requestedPool: pool, availablePools },
  });
}
