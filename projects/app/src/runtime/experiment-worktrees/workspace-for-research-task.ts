import { experimentRepository } from "../../data/repositories/experiments";
import type { ResolvedExperimentWorkspace, WorktreeRuntimeContext } from "./types";
import { workspaceForExperiment } from "./workspace-for-experiment";

export async function workspaceForResearchTask({
  researchTaskId,
  runtime,
}: {
  researchTaskId: string;
  runtime: WorktreeRuntimeContext;
}): Promise<ResolvedExperimentWorkspace> {
  const researchTaskExperiments = await experimentRepository.listByResearchTask({ researchTaskId });
  if (researchTaskExperiments.length === 0) {
    throw new Error(`No experiment is associated with ResearchTask: ${researchTaskId}`);
  }
  if (researchTaskExperiments.length > 1) {
    throw new Error(
      `Multiple experiments are associated with ResearchTask ${researchTaskId}; pass experimentId explicitly.`,
    );
  }
  return workspaceForExperiment({
    experimentId: researchTaskExperiments[0].id,
    researchTaskId,
    runtime,
    inferredFromResearchTask: true,
  });
}
