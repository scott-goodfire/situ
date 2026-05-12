import { researchProjectRepository } from "@situ/research-projects";
import { ensureRuntimeContext } from "@situ/app/runtime";

import { readLiveAgentSliceRunnerConfig } from "./config";
import { runLiveAgentSliceDriver } from "./drivers";
import { hasFailedRuntimeState, printLiveAgentSliceRunnerReport } from "./report";
import { seedResearchTasks } from "./seed-research-tasks";

export async function runLiveAgentSliceRunnerCli({ argv }: { argv: string[] }): Promise<void> {
  const config = readLiveAgentSliceRunnerConfig({ argv });
  const runtime = await ensureRuntimeContext();
  const researchProject = await researchProjectRepository.create({
    goal: config.goal,
    payload: {
      source: "live-agent-eval",
      driver: config.driver,
      runtimeSessionId: runtime.sessionId,
    },
  });

  if (config.projectPhase !== "onboarding" || config.baselineSummary) {
    await researchProjectRepository.updatePhase({
      researchProjectId: researchProject.id,
      phase: config.projectPhase,
      baselineSummary: config.baselineSummary,
    });
  }

  if (config.driver !== "manager_turn") {
    await researchProjectRepository.transition({
      researchProjectId: researchProject.id,
      status: "blocked_on_user",
      resultSummary: "Live eval is exercising a focused non-Manager slice.",
    });
  }

  await seedResearchTasks({
    researchProjectId: researchProject.id,
    seeds: config.seedResearchTasks,
  });

  const summary = await runLiveAgentSliceDriver({
    config,
    researchProjectId: researchProject.id,
  });
  const finalResearchProject = await researchProjectRepository.require({
    researchProjectId: researchProject.id,
  });
  printLiveAgentSliceRunnerReport({
    sessionId: runtime.sessionId,
    researchProject: finalResearchProject,
    summary,
  });
  if (
    hasFailedRuntimeState({
      state: summary.state,
      allowActiveResearchTasks: summary.allowActiveResearchTasks,
    })
  ) {
    process.exitCode = 2;
  }
}
