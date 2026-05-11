import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

import { getRuntimeContext } from "../../config/session-context";
import { experimentRepository } from "../../data/repositories/experiments";
import { researchTaskRepository } from "../../data/repositories/research-tasks";
import { assertCleanGitWorktree, git, sourceGitRoot } from "./git-command";
import { safePathSegment } from "./path-utils";
import type { PrepareExperimentWorktreeResult, WorktreeRuntimeContext } from "./types";

type ExperimentRecord = Awaited<ReturnType<typeof experimentRepository.require>>;

export async function prepareExperimentWorktree({
  experimentId,
  runtime = getRuntimeContext(),
  requireCleanSource = true,
}: {
  experimentId: string;
  runtime?: WorktreeRuntimeContext;
  requireCleanSource?: boolean;
}): Promise<PrepareExperimentWorktreeResult> {
  const experiment = await experimentRepository.require({ experimentId });
  if (experiment.worktreePath && experiment.baseCommit) {
    return {
      experimentId,
      worktreePath: experiment.worktreePath,
      baseCommit: experiment.baseCommit,
    };
  }

  const repoPath = await sourceGitRoot({ repoPath: runtime.repoPath });
  if (requireCleanSource) {
    await assertCleanGitWorktree({ repoPath, label: "source workspace" });
  }

  const baseCommit = await resolveBaseCommit({ experiment, repoPath });
  const worktreePath = join(
    runtime.sessionHome,
    "worktrees",
    safePathSegment({ value: experimentId }),
  );

  await mkdir(dirname(worktreePath), { recursive: true });
  if (!existsSync(worktreePath)) {
    await git({
      cwd: repoPath,
      args: ["worktree", "add", "--detach", worktreePath, baseCommit],
    });
  }

  await experimentRepository.updateWorktreeMetadata({
    experimentId,
    worktreePath,
    baseCommit,
  });

  await experimentRepository.addActivity({
    experimentId,
    actor: "system",
    kind: "recorded",
    body: `Created experiment worktree at ${worktreePath}.`,
    payload: {
      activityType: "experiment_worktree_created",
      worktreePath,
      baseCommit,
    },
  });

  return { experimentId, worktreePath, baseCommit };
}

async function resolveBaseCommit({
  experiment,
  repoPath,
}: {
  experiment: ExperimentRecord;
  repoPath: string;
}): Promise<string> {
  const parentCandidateCommit = await resolveParentCandidateCommit({ experiment });
  if (parentCandidateCommit) {
    return parentCandidateCommit;
  }

  return git({
    cwd: repoPath,
    args: ["rev-parse", "HEAD"],
    trimStdout: true,
  });
}

async function resolveParentCandidateCommit({
  experiment,
}: {
  experiment: ExperimentRecord;
}): Promise<string | undefined> {
  if (!experiment.parentExperimentId) {
    return undefined;
  }

  const parentExperiment = await experimentRepository.require({
    experimentId: experiment.parentExperimentId,
  });
  if (!parentExperiment.candidateCommit) {
    throw new Error(`Parent experiment has no captured candidate commit: ${parentExperiment.id}`);
  }
  if (!parentExperiment.createdByResearchTaskId) {
    throw new Error(`Parent experiment has no ResearchTask: ${parentExperiment.id}`);
  }

  const parentResearchTask = await researchTaskRepository.require({
    researchTaskId: parentExperiment.createdByResearchTaskId,
  });
  if (parentResearchTask.status !== "verified") {
    throw new Error(
      `Parent experiment ResearchTask must be verified before child worktree creation: ${parentExperiment.id} (researchTaskId: ${parentResearchTask.id}, status: ${parentResearchTask.status})`,
    );
  }

  return parentExperiment.candidateCommit;
}
