import { worktreeModule } from "@situ/worktrees";

import { experimentRepository } from "../../data/repositories/experiments";
import { prepareExperimentWorktree } from "./prepare-experiment-worktree";
import type { ResolvedExperimentWorkspace, WorktreeRuntimeContext } from "./types";

export async function workspaceForExperiment({
  experimentId,
  researchTaskId,
  worktreePath,
  runtime,
  inferredFromResearchTask,
}: {
  experimentId: string;
  researchTaskId?: string;
  worktreePath?: string;
  runtime: WorktreeRuntimeContext;
  inferredFromResearchTask: boolean;
}): Promise<ResolvedExperimentWorkspace> {
  const experiment = await experimentRepository.require({ experimentId });
  if (
    researchTaskId &&
    experiment.createdByResearchTaskId &&
    experiment.createdByResearchTaskId !== researchTaskId
  ) {
    throw new Error(
      `Experiment ${experimentId} does not belong to ResearchTask ${researchTaskId}.`,
    );
  }
  const workspace =
    experiment.worktreePath && experiment.baseCommit
      ? {
          experimentId,
          worktreePath: experiment.worktreePath,
          baseCommit: experiment.baseCommit,
        }
      : await prepareExperimentWorktree({ experimentId, runtime });

  if (worktreePath) {
    await worktreeModule.assertSameRealPath({
      left: worktreePath,
      right: workspace.worktreePath,
      label: `Experiment worktreePath does not match ${experimentId}`,
    });
  }

  return { ...workspace, inferredFromResearchTask };
}
