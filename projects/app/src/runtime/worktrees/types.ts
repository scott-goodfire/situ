import type { SessionRuntimeContext } from "../../config/session-context";

export type WorktreeRuntimeContext = Pick<SessionRuntimeContext, "repoPath" | "sessionHome">;

export type PrepareExperimentWorktreeResult = {
  experimentId: string;
  worktreePath: string;
  baseCommit: string;
};

export type CaptureExperimentCandidateResult = {
  experimentId: string;
  baseCommit: string;
  candidateCommit: string | null;
  patchArtifactId: string | null;
};

export type ExperimentWorkspaceRef = {
  experimentId?: string;
  researchTaskId?: string;
  worktreePath?: string;
  runtime?: WorktreeRuntimeContext;
};

export type ResolvedExperimentWorkspace = {
  experimentId: string;
  worktreePath: string;
  baseCommit: string;
  inferredFromResearchTask: boolean;
};

export type ExperimentWorkspaceCommandResult = {
  experimentId: string;
  worktreePath: string;
  baseCommit: string;
  command: string;
  cwd: string;
  exitCode: number;
  success: boolean;
  timedOut: boolean;
  outputTruncated: boolean;
  stdout: string;
  stderr: string;
  changedFiles: string[];
};
