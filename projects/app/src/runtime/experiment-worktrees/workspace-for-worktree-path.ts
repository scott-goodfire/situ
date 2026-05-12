import { experimentRepository } from "../../data/repositories/experiments";
import type { ResolvedExperimentWorkspace } from "./types";

export async function workspaceForWorktreePath({
  researchTaskId,
  worktreePath,
}: {
  researchTaskId?: string;
  worktreePath: string;
}): Promise<ResolvedExperimentWorkspace> {
  const experiment = await experimentRepository.findByWorktreePath({
    worktreePath,
  });
  if (!experiment) {
    throw new Error(`Experiment worktreePath is not registered: ${worktreePath}`);
  }
  if (researchTaskId && experiment.createdByResearchTaskId !== researchTaskId) {
    throw new Error(
      `Experiment worktreePath does not belong to ResearchTask ${researchTaskId}: ${worktreePath}`,
    );
  }
  if (!experiment.baseCommit) {
    throw new Error(`Experiment worktree has no base commit: ${experiment.id}`);
  }
  return {
    experimentId: experiment.id,
    worktreePath: experiment.worktreePath ?? worktreePath,
    baseCommit: experiment.baseCommit,
    inferredFromResearchTask: false,
  };
}
