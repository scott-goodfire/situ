import { RESEARCH_TASK_PRIORITIES, RESEARCH_TASK_TYPES } from "@situ/protocol";
import { z } from "zod";

import { ensureRuntimeContext } from "../../config/session-context";
import { maxScientistConcurrency } from "../../config/runtime";
import { researchProjectRepository } from "../../data/repositories/research-projects";
import { researchTaskRepository } from "../../data/repositories/research-tasks";
import { ensureDefaultLocalComputeTargets } from "../compute";
import { createRuntimeScheduler } from "../scheduler";
import { waitForAutomationUntilIdle } from "./runner";

const liveResearchTaskEvalConfigSchema = z.object({
  goal: z.string().trim().min(1, "Live research task eval goal is required."),
  title: z.string().trim().min(1, "Live research task eval title is required."),
  type: z.enum(RESEARCH_TASK_TYPES).optional(),
  priority: z.enum(RESEARCH_TASK_PRIORITIES).optional(),
  workerPrompt: z.string().trim().min(1, "Live research task eval workerPrompt is required."),
  verificationPrompt: z
    .string()
    .trim()
    .min(1, "Live research task eval verificationPrompt is required."),
  timeoutSeconds: z
    .number()
    .refine(
      (value) => Number.isFinite(value) && value > 0,
      "Live research task eval timeoutSeconds must be a positive number.",
    ),
});

type LiveResearchTaskEvalConfig = z.infer<typeof liveResearchTaskEvalConfigSchema>;

async function main(): Promise<void> {
  const config = readConfig();
  const runtime = await ensureRuntimeContext();
  const researchProject = await researchProjectRepository.create({
    goal: config.goal,
    payload: {
      source: "live-agent-eval",
      runtimeSessionId: runtime.sessionId,
    },
  });
  await researchProjectRepository.updatePhase({
    researchProjectId: researchProject.id,
    phase: "search",
    baselineSummary: "Live eval seeded a focused ResearchTask to establish the fixture baseline.",
  });
  await researchProjectRepository.transition({
    researchProjectId: researchProject.id,
    status: "blocked_on_user",
    resultSummary: "Live eval is exercising a seeded Scientist and Verifier ResearchTask slice.",
  });
  const researchTask = await researchTaskRepository.create({
    researchProjectId: researchProject.id,
    type: config.type ?? "explore",
    priority: config.priority ?? "high",
    title: config.title,
    workerPrompt: config.workerPrompt,
    verificationPrompt: config.verificationPrompt,
    payload: {
      source: "live-agent-eval",
    },
  });

  await ensureDefaultLocalComputeTargets({ desiredCount: maxScientistConcurrency() });
  const scheduler = createRuntimeScheduler();
  scheduler.start();
  const summary = await waitForAutomationUntilIdle({
    timeoutSeconds: config.timeoutSeconds,
    onProgress: ({ state }) => {
      console.error(`LIVE_AGENT_EVAL_PROGRESS ${JSON.stringify(state)}`);
    },
  }).finally(async () => {
    await scheduler.stop();
  });

  const finalResearchProject = await researchProjectRepository.require({
    researchProjectId: researchProject.id,
  });
  const finalResearchTask = await researchTaskRepository.require({
    researchTaskId: researchTask.id,
  });
  console.log(
    `${JSON.stringify(
      {
        sessionId: runtime.sessionId,
        researchProject: finalResearchProject,
        researchTask: finalResearchTask,
        summary,
      },
      null,
      2,
    )}\n`,
  );
  if (
    summary.status !== "idle" ||
    summary.state.failedResearchTasks > 0 ||
    summary.state.failedWorkItems > 0 ||
    summary.state.failedClaudeAgentRuns > 0
  ) {
    process.exitCode = 2;
  }
}

function readConfig(): LiveResearchTaskEvalConfig {
  const raw = Bun.argv[2];
  if (!raw) {
    throw new Error("Live research task eval config JSON is required.");
  }
  return liveResearchTaskEvalConfigSchema.parse(JSON.parse(raw) as unknown);
}

await main();
