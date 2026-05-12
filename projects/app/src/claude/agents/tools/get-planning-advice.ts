import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { experimentRepository } from "@situ/research-records";
import { hypothesisRepository } from "@situ/research-records";
import { researchProjectRepository } from "@situ/research-projects";
import { researchTaskRepository, type ResearchTaskRecord } from "@situ/research-projects";
import { getAnthropicClient } from "../anthropic-client";
import { defineTool } from "./define-tool";
import { planningAdviceSystemPrompt } from "./__shared__/planning-advice-prompt";
import {
  fallbackPlanningAdvice,
  parsePlanningAdvice,
  planningAdviceSchema,
  PLANNING_ADVICE_MODEL,
  type PlanningAdvice,
} from "./__shared__/planning-advice-types";
import { Result } from "@situ/agent-tools";
import { toolContextModule } from "./__shared__/tool-context-module";

export { fallbackPlanningAdvice, parsePlanningAdvice, planningAdviceSchema, PLANNING_ADVICE_MODEL };
export type { PlanningAdvice };

export const PLANNING_ADVICE_RECENT_TASK_WINDOW = 10;
export const PLANNING_ADVICE_TRIAGE_LIMIT = 10;
export const PLANNING_ADVICE_BRANCH_EXPERIMENT_LIMIT = 10;
const PLANNING_ADVICE_MAX_OUTPUT_TOKENS = 1024;

export type TriageHypothesisSummary = {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
};

export type BranchExperimentSummary = {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
};

export type ActiveBranchSummary = {
  readonly hypothesisId: string;
  readonly title: string;
  readonly summary: string;
  readonly experiments: readonly BranchExperimentSummary[];
};

export type PlanningSnapshot = {
  readonly goal: string;
  readonly phase: string;
  readonly recentVerifiedTasks: readonly ResearchTaskRecord[];
  readonly activeBranches: readonly ActiveBranchSummary[];
  readonly triageHypotheses: readonly TriageHypothesisSummary[];
};

const inputSchema = z.object({
  researchProjectId: z
    .string()
    .describe("ResearchProject id. Defaults to the active ResearchProject work item.")
    .optional(),
});

export const getPlanningAdviceTool = defineTool({
  name: "get_planning_advice",
  description: [
    "Get a short planning advisory at the start of each planning turn.",
    "Returns a diversity signal (low, mixed, or broad), a one-sentence summary of recent activity,",
    "the recently active hypothesis branches, the stranded triage hypotheses, and a one-sentence",
    "suggestion for the next batch. Treat the suggestion as advisory, not binding.",
  ].join(" "),
  roles: ["manager"],
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input, context }) => {
    const researchProjectId = toolContextModule.researchProjectId({
      explicit: input.researchProjectId,
      context,
    });
    try {
      const snapshot = await gatherPlanningSnapshot({ researchProjectId });
      return Result.ok(await advise({ snapshot }));
    } catch {
      return Result.ok(fallbackPlanningAdvice());
    }
  },
});

export async function gatherPlanningSnapshot({
  researchProjectId,
}: {
  researchProjectId: string;
}): Promise<PlanningSnapshot> {
  const project = await researchProjectRepository.require({ researchProjectId });
  const allTasks = await researchTaskRepository.list({ limit: 200 });
  const verifiedTasks = allTasks.filter((task) => task.status === "verified");
  const recentVerifiedTasks = verifiedTasks.slice(-PLANNING_ADVICE_RECENT_TASK_WINDOW);
  const triageHypotheses = await hypothesisRepository.search({
    status: "triage",
    limit: PLANNING_ADVICE_TRIAGE_LIMIT,
  });
  const activeBranches = await gatherActiveBranches();
  return {
    goal: project.goal,
    phase: project.phase,
    recentVerifiedTasks,
    activeBranches,
    triageHypotheses: triageHypotheses.map((hypothesis) => ({
      id: hypothesis.id,
      title: hypothesis.title,
      summary: hypothesis.summary,
    })),
  };
}

async function gatherActiveBranches(): Promise<ActiveBranchSummary[]> {
  const allHypotheses = await hypothesisRepository.list({ limit: 50 });
  const allExperiments = await experimentRepository.list({ limit: 200 });
  const experimentsByHypothesis = new Map<string, typeof allExperiments>();
  for (const experiment of allExperiments) {
    const bucket = experimentsByHypothesis.get(experiment.associatedHypothesisId) ?? [];
    bucket.push(experiment);
    experimentsByHypothesis.set(experiment.associatedHypothesisId, bucket);
  }
  const inactiveStatuses = new Set(["triage", "failed", "canceled"]);
  return allHypotheses
    .filter((hypothesis) => !inactiveStatuses.has(hypothesis.status))
    .map((hypothesis) => {
      const experiments = (experimentsByHypothesis.get(hypothesis.id) ?? [])
        .slice()
        .reverse()
        .slice(-PLANNING_ADVICE_BRANCH_EXPERIMENT_LIMIT);
      return {
        hypothesisId: hypothesis.id,
        title: hypothesis.title,
        summary: hypothesis.summary,
        experiments: experiments.map((experiment) => ({
          id: experiment.id,
          title: experiment.title,
          summary: experiment.summary,
        })),
      };
    })
    .filter((branch) => branch.experiments.length > 0);
}

export function formatPlanningSnapshot({ snapshot }: { snapshot: PlanningSnapshot }): string {
  const lines: string[] = [];
  lines.push(`Project goal: ${snapshot.goal}`);
  lines.push(`Phase: ${snapshot.phase}.`);
  lines.push("");
  lines.push("Active hypothesis branches:");
  if (snapshot.activeBranches.length === 0) {
    lines.push("  (none)");
  } else {
    for (const branch of snapshot.activeBranches) {
      lines.push("");
      lines.push(`  Branch ${branch.hypothesisId} — "${branch.title}"`);
      lines.push(`  Summary: ${branch.summary}`);
      lines.push("  Experiments (oldest to newest):");
      for (const experiment of branch.experiments) {
        lines.push(`    ${experiment.id} · "${experiment.title}" · ${experiment.summary}`);
      }
    }
  }
  lines.push("");
  lines.push("Recent verified tasks (oldest first):");
  if (snapshot.recentVerifiedTasks.length === 0) {
    lines.push("  (none)");
  } else {
    for (const task of snapshot.recentVerifiedTasks) {
      const target =
        task.targetKind && task.targetId ? `${task.targetKind} ${task.targetId}` : "no target";
      lines.push(`  ${task.type} · "${task.title}" · ${target}`);
    }
  }
  lines.push("");
  lines.push("Triage hypotheses (untested):");
  if (snapshot.triageHypotheses.length === 0) {
    lines.push("  (none)");
  } else {
    for (const hypothesis of snapshot.triageHypotheses) {
      lines.push(`  ${hypothesis.id} · "${hypothesis.title}" · ${hypothesis.summary}`);
    }
  }
  return lines.join("\n");
}

async function advise({ snapshot }: { snapshot: PlanningSnapshot }): Promise<PlanningAdvice> {
  const userMessage = formatPlanningSnapshot({ snapshot });
  try {
    const client = await getAnthropicClient();
    const response = await client.messages.create({
      model: PLANNING_ADVICE_MODEL,
      max_tokens: PLANNING_ADVICE_MAX_OUTPUT_TOKENS,
      system: [
        {
          type: "text",
          text: planningAdviceSystemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });
    const text = extractFirstText({ response });
    return parsePlanningAdvice({ text }) ?? fallbackPlanningAdvice();
  } catch {
    return fallbackPlanningAdvice();
  }
}

function extractFirstText({ response }: { response: Anthropic.Messages.Message }): string {
  for (const block of response.content) {
    if (block.type === "text") {
      return block.text;
    }
  }
  return "";
}
