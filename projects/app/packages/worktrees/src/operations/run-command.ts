import { clampNumber, decodeProcessOutput, mergedCommandEnv } from "../__shared__";
import { changedFiles } from "./git";
import type { CommandResult } from "../types";

/**
 * Run a shell command inside a worktree with bounded timeout/buffer and a
 * post-command `git status` check that returns the changed files. The
 * caller resolves `cwd` (typically via `resolveWorkspaceDirectory` for
 * subdirectory paths) before calling.
 */
export async function runCommand({
  worktreePath,
  cwd,
  command,
  env,
  timeoutMs = 60_000,
  maxOutputBytes = 64_000,
}: {
  worktreePath: string;
  cwd: string;
  command: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  maxOutputBytes?: number;
}): Promise<CommandResult> {
  if (!command.trim()) {
    throw new Error("Workspace command is required.");
  }
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
  const result = Bun.spawnSync({
    cmd: [process.env.SHELL ?? "/bin/bash", "-lc", command],
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: mergedCommandEnv({ env }),
    timeout: boundedTimeoutMs,
    killSignal: "SIGKILL",
    maxBuffer: boundedMaxOutputBytes,
  });
  const changed = await changedFiles({ worktreePath });
  return {
    command,
    cwd,
    exitCode: result.exitCode,
    success: result.success,
    timedOut: result.exitedDueToTimeout ?? false,
    outputTruncated: result.exitedDueToMaxBuffer ?? false,
    stdout: decodeProcessOutput({ value: result.stdout }),
    stderr: decodeProcessOutput({ value: result.stderr }),
    changedFiles: changed,
  };
}
