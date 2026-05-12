import { realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import { worktreeModule } from "@situ/worktrees";

import { getRuntimeContext, type SessionRuntimeContext } from "../../../../config/session-context";
import { PreconditionError } from "../../../../data/repositories/__shared__";

type SourceWorkspaceRuntimeContext = Pick<SessionRuntimeContext, "repoPath" | "sessionHome">;

type SourceWorkspaceStatusEntry = {
  line: string;
  path: string;
};

type SourceWorkspaceSnapshot = {
  entries: SourceWorkspaceStatusEntry[];
  trackedDiffFingerprint: string;
};

export type ReadonlyWorkspaceCommandResult = {
  workspacePath: string;
  command: string;
  cwd: string;
  exitCode: number;
  commandSucceeded: boolean;
  success: boolean;
  timedOut: boolean;
  outputTruncated: boolean;
  stdout: string;
  stderr: string;
  readOnlyViolation: boolean;
  changedFiles: string[];
  preexistingDirtyFiles: string[];
  postCommandDirtyFiles: string[];
};

export async function runReadonlyWorkspaceCommand({
  command,
  env,
  workingDirectory,
  timeoutMs = 60_000,
  maxOutputBytes = 64_000,
  runtime = getRuntimeContext(),
}: {
  command: string;
  env?: Record<string, string>;
  workingDirectory?: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
  runtime?: SourceWorkspaceRuntimeContext;
}): Promise<ReadonlyWorkspaceCommandResult> {
  if (!command.trim()) {
    throw new PreconditionError({
      code: "workspace_command_required",
      hint: "Provide a non-empty command string.",
    });
  }
  const workspacePath = await sourceWorkspaceRoot({ repoPath: runtime.repoPath });
  const cwd = workingDirectory
    ? await resolveSourceWorkspaceDirectory({
        workspaceRoot: workspacePath,
        path: workingDirectory,
      })
    : workspacePath;
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
  const beforeSnapshot = sourceWorkspaceSnapshot({ cwd: workspacePath });
  const outputEnv = await worktreeModule.commandOutputEnv({
    label: "source",
    outputRoot: runtime.sessionHome,
  });

  const result = Bun.spawnSync({
    cmd: [process.env.SHELL ?? "/bin/bash", "-lc", command],
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: mergedCommandEnv({ env: { ...outputEnv, ...env } }),
    timeout: boundedTimeoutMs,
    killSignal: "SIGKILL",
    maxBuffer: boundedMaxOutputBytes,
  });

  const afterSnapshot = sourceWorkspaceSnapshot({ cwd: workspacePath });
  const changedFiles = statusChangedFiles({
    before: beforeSnapshot,
    after: afterSnapshot,
  });
  const readOnlyViolation = changedFiles.length > 0;
  const commandSucceeded = result.success;

  return {
    workspacePath,
    command,
    cwd,
    exitCode: result.exitCode,
    commandSucceeded,
    success: commandSucceeded && !readOnlyViolation,
    timedOut: result.exitedDueToTimeout ?? false,
    outputTruncated: result.exitedDueToMaxBuffer ?? false,
    stdout: decodeProcessOutput({ value: result.stdout }),
    stderr: decodeProcessOutput({ value: result.stderr }),
    readOnlyViolation,
    changedFiles,
    preexistingDirtyFiles: statusPaths({ entries: beforeSnapshot.entries }),
    postCommandDirtyFiles: statusPaths({ entries: afterSnapshot.entries }),
  };
}

async function sourceWorkspaceRoot({ repoPath }: { repoPath: string }): Promise<string> {
  const realRepoPath = await realpath(repoPath);
  const gitRoot = runGitRevParse({ cwd: realRepoPath });
  return gitRoot ? await realpath(gitRoot) : realRepoPath;
}

function runGitRevParse({ cwd }: { cwd: string }): string | undefined {
  const result = Bun.spawnSync({
    cmd: ["git", "rev-parse", "--show-toplevel"],
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    return undefined;
  }
  return decodeProcessOutput({ value: result.stdout }).trim() || undefined;
}

function sourceWorkspaceSnapshot({ cwd }: { cwd: string }): SourceWorkspaceSnapshot {
  return {
    entries: sourceWorkspaceGitStatus({ cwd }),
    trackedDiffFingerprint: sourceWorkspaceTrackedDiffFingerprint({ cwd }),
  };
}

function statusChangedFiles({
  before,
  after,
}: {
  before: SourceWorkspaceSnapshot;
  after: SourceWorkspaceSnapshot;
}): string[] {
  const beforeLines = new Set(before.entries.map((entry) => entry.line));
  const afterLines = new Set(after.entries.map((entry) => entry.line));
  const diffChanged =
    before.trackedDiffFingerprint !== after.trackedDiffFingerprint
      ? [...before.entries, ...after.entries].map((entry) => entry.path)
      : [];
  return [
    ...new Set(
      [...before.entries, ...after.entries]
        .filter((entry) => !beforeLines.has(entry.line) || !afterLines.has(entry.line))
        .map((entry) => entry.path)
        .concat(diffChanged),
    ),
  ].sort();
}

function sourceWorkspaceGitStatus({ cwd }: { cwd: string }): SourceWorkspaceStatusEntry[] {
  const result = Bun.spawnSync({
    cmd: ["git", "status", "--porcelain=v1", "--untracked-files=all"],
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    return [];
  }
  return decodeProcessOutput({ value: result.stdout })
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => ({
      line,
      path: statusPath({ line }),
    }));
}

function sourceWorkspaceTrackedDiffFingerprint({ cwd }: { cwd: string }): string {
  return [
    runGitRaw({ cwd, args: ["diff", "--raw", "--no-abbrev", "--no-ext-diff"] }),
    runGitRaw({ cwd, args: ["diff", "--cached", "--raw", "--no-abbrev", "--no-ext-diff"] }),
  ].join("\n");
}

function runGitRaw({ cwd, args }: { cwd: string; args: string[] }): string {
  const result = Bun.spawnSync({
    cmd: ["git", ...args],
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    return "";
  }
  return decodeProcessOutput({ value: result.stdout }).trim();
}

function statusPaths({ entries }: { entries: SourceWorkspaceStatusEntry[] }): string[] {
  return [...new Set(entries.map((entry) => entry.path))].sort();
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

async function resolveSourceWorkspaceDirectory({
  workspaceRoot,
  path,
}: {
  workspaceRoot: string;
  path: string;
}): Promise<string> {
  const resolvedPath = await resolveSourceWorkspacePath({
    workspaceRoot,
    path,
    mustExist: true,
  });
  const pathStat = await stat(resolvedPath);
  if (!pathStat.isDirectory()) {
    throw new PreconditionError({
      code: "workspace_path_not_directory",
      hint: "Pass a path that resolves to a directory inside the source workspace.",
      details: { path },
    });
  }
  return resolvedPath;
}

async function resolveSourceWorkspacePath({
  workspaceRoot,
  path,
  mustExist,
}: {
  workspaceRoot: string;
  path: string;
  mustExist: boolean;
}): Promise<string> {
  if (!path.trim()) {
    throw new PreconditionError({
      code: "workspace_path_required",
      hint: "Provide a non-empty workspace path.",
    });
  }
  if (path.includes("\0")) {
    throw new PreconditionError({
      code: "workspace_path_invalid",
      hint: "Workspace paths may not contain NUL characters.",
      details: { path },
    });
  }

  const root = await realpath(workspaceRoot);
  const absolutePath = isAbsolute(path) ? path : resolve(root, path);
  if (!mustExist) {
    assertPathInside({ root, path: absolutePath });
    return absolutePath;
  }
  const realTarget = await realpath(absolutePath);
  assertPathInside({ root, path: realTarget });
  return realTarget;
}

function assertPathInside({ root, path }: { root: string; path: string }): void {
  const rel = relative(root, path);
  if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) {
    return;
  }
  throw new PreconditionError({
    code: "workspace_path_escape",
    hint: "Use a path that stays inside the source workspace root.",
    details: { path },
  });
}

function clampNumber({ value, min, max }: { value: number; min: number; max: number }): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(Math.trunc(value), min), max);
}

function decodeProcessOutput({ value }: { value: Uint8Array }): string {
  return new TextDecoder().decode(value);
}

function mergedCommandEnv({
  env,
}: {
  env?: Record<string, string>;
}): Record<string, string> | undefined {
  if (!env) {
    return undefined;
  }
  const merged: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") {
      merged[key] = value;
    }
  }
  return { ...merged, ...env };
}
