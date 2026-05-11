import { getRuntimeContext } from "../../config/session-context";
import { resolveExperimentWorkspace } from "./resolve-experiment-workspace";
import type { ExperimentWorkspaceCommandResult, ExperimentWorkspaceRef } from "./types";
import { resolveWorkspaceDirectory } from "./workspace-paths";
import { clampNumber } from "./path-utils";
import { commandOutputEnv } from "./command-output-env";
import { decodeProcessOutput, mergedCommandEnv } from "./process-output";
import { git } from "./git-command";

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
  if (!command.trim()) {
    throw new Error("Experiment workspace command is required.");
  }
  const runtime = workspaceRef.runtime ?? getRuntimeContext();
  const workspace = await resolveExperimentWorkspace({ ...workspaceRef, runtime });
  const cwd = workingDirectory
    ? await resolveWorkspaceDirectory({
        workspaceRoot: workspace.worktreePath,
        path: workingDirectory,
      })
    : workspace.worktreePath;
  const boundedTimeoutMs = clampNumber({
    value: timeoutMs,
    min: 1_000,
    max: 10 * 60_000,
  });
  const boundedMaxOutputBytes = clampNumber({
    value: maxOutputBytes,
    min: 1_024,
    max: 1024 * 1024,
  });

  const outputEnv = await commandOutputEnv({ label: workspace.experimentId, runtime });
  const result = Bun.spawnSync({
    cmd: [process.env.SHELL ?? "/bin/bash", "-lc", command],
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: mergedCommandEnv({
      env: {
        ...outputEnv,
        SITU_EXPERIMENT_OUTPUT_DIR: outputEnv.SITU_COMMAND_OUTPUT_DIR,
        ...env,
      },
    }),
    timeout: boundedTimeoutMs,
    killSignal: "SIGKILL",
    maxBuffer: boundedMaxOutputBytes,
  });
  const changedFiles = await changedWorkspaceFiles({ worktreePath: workspace.worktreePath });

  return {
    experimentId: workspace.experimentId,
    worktreePath: workspace.worktreePath,
    baseCommit: workspace.baseCommit,
    command,
    cwd,
    exitCode: result.exitCode,
    success: result.success,
    timedOut: result.exitedDueToTimeout ?? false,
    outputTruncated: result.exitedDueToMaxBuffer ?? false,
    stdout: decodeProcessOutput({ value: result.stdout }),
    stderr: decodeProcessOutput({ value: result.stderr }),
    changedFiles,
  };
}

async function changedWorkspaceFiles({
  worktreePath,
}: {
  worktreePath: string;
}): Promise<string[]> {
  const status = await git({
    cwd: worktreePath,
    args: ["status", "--porcelain=v1", "--untracked-files=all"],
    trimStdout: true,
  });
  return status
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => statusPath({ line }))
    .sort();
}

function statusPath({ line }: { line: string }): string {
  const rawPath = line.slice(3).trim();
  const renameSeparator = " -> ";
  const renameIndex = rawPath.indexOf(renameSeparator);
  if (renameIndex === -1) {
    return rawPath;
  }
  return rawPath.slice(renameIndex + renameSeparator.length).trim();
}
