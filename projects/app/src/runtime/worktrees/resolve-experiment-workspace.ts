import { getRuntimeContext } from "../../config/session-context";
import type { ExperimentWorkspaceRef, ResolvedExperimentWorkspace } from "./types";
import { workspaceForExperiment } from "./workspace-for-experiment";
import { workspaceForResearchTask } from "./workspace-for-research-task";
import { workspaceForWorktreePath } from "./workspace-for-worktree-path";

enum ExperimentWorkspaceRefKind {
  Experiment = "experiment",
  Missing = "missing",
  ResearchTask = "research_task",
  WorktreePath = "worktree_path",
}

export async function resolveExperimentWorkspace({
  experimentId,
  researchTaskId,
  worktreePath,
  runtime = getRuntimeContext(),
}: ExperimentWorkspaceRef): Promise<ResolvedExperimentWorkspace> {
  const kind = experimentWorkspaceRefKind({ experimentId, researchTaskId, worktreePath });
  if (kind === ExperimentWorkspaceRefKind.Experiment) {
    return workspaceForExperiment({
      experimentId: String(experimentId),
      researchTaskId,
      worktreePath,
      runtime,
      inferredFromResearchTask: false,
    });
  }
  if (kind === ExperimentWorkspaceRefKind.WorktreePath) {
    return workspaceForWorktreePath({
      researchTaskId,
      worktreePath: String(worktreePath),
    });
  }
  if (kind === ExperimentWorkspaceRefKind.ResearchTask) {
    return workspaceForResearchTask({
      researchTaskId: String(researchTaskId),
      runtime,
    });
  }
  throw new Error("experimentId, worktreePath, or researchTaskId is required.");
}

function experimentWorkspaceRefKind({
  experimentId,
  researchTaskId,
  worktreePath,
}: {
  experimentId?: string;
  researchTaskId?: string;
  worktreePath?: string;
}): ExperimentWorkspaceRefKind {
  if (experimentId) {
    return ExperimentWorkspaceRefKind.Experiment;
  }
  if (worktreePath) {
    return ExperimentWorkspaceRefKind.WorktreePath;
  }
  if (researchTaskId) {
    return ExperimentWorkspaceRefKind.ResearchTask;
  }
  return ExperimentWorkspaceRefKind.Missing;
}
