import { worktreeModule } from "@situ/worktrees";

import { getRuntimeContext } from "../../config/session-context";
import { resolveExperimentWorkspace } from "./resolve-experiment-workspace";
import type { ExperimentWorkspaceCommandResult, ExperimentWorkspaceRef } from "./types";

export async function runExperimentWorkspaceCommand({
  command,
  env,
  workingDirectory,
  timeoutMs = 60_000,
  maxOutputBytes = 64_000,
  ...workspaceRef
}: ExperimentWorkspaceRef & {
  command: string;
  env?: Record<string, string>;
  workingDirectory?: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
}): Promise<ExperimentWorkspaceCommandResult> {
  const runtime = workspaceRef.runtime ?? getRuntimeContext();
  const workspace = await resolveExperimentWorkspace({ ...workspaceRef, runtime });
  const cwd = workingDirectory
    ? await worktreeModule.resolveWorkspaceDirectory({
        workspaceRoot: workspace.worktreePath,
        path: workingDirectory,
      })
    : workspace.worktreePath;
  const outputEnv = await worktreeModule.commandOutputEnv({
    label: workspace.experimentId,
    outputRoot: runtime.sessionHome,
  });
  const result = await worktreeModule.runCommand({
    worktreePath: workspace.worktreePath,
    cwd,
    command,
    env: {
      ...outputEnv,
      SITU_EXPERIMENT_OUTPUT_DIR: outputEnv.SITU_COMMAND_OUTPUT_DIR,
      ...env,
    },
    timeoutMs,
    maxOutputBytes,
  });
  return {
    experimentId: workspace.experimentId,
    worktreePath: workspace.worktreePath,
    baseCommit: workspace.baseCommit,
    ...result,
  };
}
