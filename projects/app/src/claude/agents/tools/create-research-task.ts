import { z } from "zod";
import { RESEARCH_TASK_PRIORITIES, RESEARCH_TASK_TYPES } from "@situ/protocol";

import { computeTargetRepository } from "../../../data/repositories/compute-targets";
import { researchTaskRepository } from "../../../data/repositories/research-tasks";
import { defineTool } from "./__shared__/define-tool";
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
  });

export const createResearchTaskTool = defineTool({
  name: "create_research_task",
  description:
    "Create a ResearchTask with workerPrompt assignment prose and Verifier verificationPrompt acceptance criteria.",
  roles: ["manager"],
  inputSchema,
  handler: async ({ input, context }) => {
    if (input.targetKind && input.targetId) {
      await toolEntityReferenceModule.assertExists({
        kind: input.targetKind,
        id: input.targetId,
      });
    }
    if (input.computePool) {
      await assertComputePoolExists({ pool: input.computePool });
    }
    const payload: Record<string, unknown> = {
      createdByClaudeAgentRunId: context.claudeAgentRunId,
    };
    if (input.computePool) {
      payload.compute = { pool: input.computePool };
    }
    const researchTask = await researchTaskRepository.create({
      researchProjectId: toolContextModule.researchProjectId({
        explicit: input.researchProjectId,
        context,
      }),
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
    return { researchTask };
  },
});

async function assertComputePoolExists({ pool }: { pool: string }): Promise<void> {
  const targets = await computeTargetRepository.listAll();
  const activeTargets = targets.filter((target) => target.status !== "dead");
  if (activeTargets.some((target) => target.pool === pool)) {
    return;
  }
  const availablePools = Array.from(new Set(activeTargets.map((target) => target.pool))).sort();
  throw new Error(
    `computePool "${pool}" is not registered. Available compute pools: ${availablePools.length ? availablePools.join(", ") : "none"}. Register a target first, for example: situ compute add --session <session-id> --pool ${pool} --kind local --label ${pool}.`,
  );
}
