import { z } from "zod";
import { RESEARCH_TASK_PRIORITIES, RESEARCH_TASK_TYPES } from "@situ/protocol";

import { computeTargetRepository, DEFAULT_LOCAL_COMPUTE_POOL } from "@situ/compute";
import { PreconditionError } from "../../../data/repositories/__shared__";
import { researchProjectRepository } from "../../../data/repositories/research-projects";
import { researchTaskRepository } from "../../../data/repositories/research-tasks";
import { defineTool } from "./__shared__/define-tool";
import { findExploitShapeTokens } from "./__shared__/explore-task-shape";
import { Result } from "./__shared__/result";
import { toolContextModule } from "./__shared__/tool-context-module";
import { ENTITY_KINDS, toolEntityReferenceModule } from "./__shared__/tool-entity-reference-module";

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
    if (input.type === "explore") {
      const matchedTokens = findExploitShapeTokens({ workerPrompt: input.workerPrompt });
      if (matchedTokens.length > 0) {
        throw new PreconditionError({
          code: "explore_prompt_has_exploit_shape",
          hint: `The workerPrompt names exploit-shape verbs/tools (${matchedTokens.join(", ")}), so this ResearchTask should be type: 'exploit' with targetKind: 'hypothesis' and a hypothesis targetId. Recreate the task with the correct type, or rewrite the workerPrompt to a read-only investigation if it should remain explore.`,
          details: { matchedTokens, suggestedType: "exploit" },
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
