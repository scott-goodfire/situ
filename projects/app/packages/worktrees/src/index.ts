import { isAbsolute, relative, resolve } from "node:path";

import { InvalidArgumentError, PreconditionError } from "@situ/errors";

export type ResolveWorkspacePathInput = {
  requestedPath: string;
  workspacePath: string;
};

export type FilterCommandEnvInput = {
  allowlist?: string[];
  env?: Record<string, string | undefined>;
};

export type RunWorkspaceCommandInput = {
  args?: string[];
  command: string;
  cwd?: string;
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
  workspacePath: string;
};

export type WorkspaceCommandResult = {
  command: string;
  args: string[];
  cwd: string;
  exitCode: number;
  timedOut: boolean;
  stdout: string;
  stderr: string;
};

const DEFAULT_ENV_ALLOWLIST = ["HOME", "PATH", "SHELL", "TMPDIR", "USER"] as const;

const isInsideWorkspace = ({ candidate, workspace }: { candidate: string; workspace: string }) => {
  const relativePath = relative(workspace, candidate);

  if (relativePath === "") {
    return true;
  }

  if (relativePath.startsWith("..")) {
    return false;
  }

  return !isAbsolute(relativePath);
};

/**
 * Resolves a path inside a workspace.
 */
export const resolveWorkspacePath = ({
  requestedPath,
  workspacePath,
}: ResolveWorkspacePathInput): string => {
  const workspace = resolve(workspacePath);
  const candidate = resolve(workspace, requestedPath);

  if (isInsideWorkspace({ candidate, workspace })) {
    return candidate;
  }

  throw new InvalidArgumentError({
    details: {
      requestedPath,
      workspacePath,
    },
    message: "Path must stay inside the workspace",
  });
};

/**
 * Filters command environment variables.
 */
export const filterCommandEnv = ({
  allowlist = [...DEFAULT_ENV_ALLOWLIST],
  env = process.env,
}: FilterCommandEnvInput = {}): Record<string, string> => {
  const filtered: Record<string, string> = {};

  for (const key of allowlist) {
    const value = env[key];

    if (value === undefined) {
      continue;
    }

    filtered[key] = value;
  }

  return filtered;
};

const readStream = async (stream: ReadableStream<Uint8Array> | null): Promise<string> => {
  if (stream === null) {
    return "";
  }

  return await new Response(stream).text();
};

/**
 * Runs a command inside a workspace.
 */
export const runWorkspaceCommand = async ({
  args = [],
  command,
  cwd = ".",
  env,
  timeoutMs = 30_000,
  workspacePath,
}: RunWorkspaceCommandInput): Promise<WorkspaceCommandResult> => {
  const resolvedCwd = resolveWorkspacePath({
    requestedPath: cwd,
    workspacePath,
  });
  const proc = Bun.spawn([command, ...args], {
    cwd: resolvedCwd,
    env: filterCommandEnv({ env }),
    stderr: "pipe",
    stdout: "pipe",
  });
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    proc.kill();
  }, timeoutMs);

  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited,
    readStream(proc.stdout),
    readStream(proc.stderr),
  ]);

  clearTimeout(timeout);

  if (timedOut) {
    return {
      args,
      command,
      cwd: resolvedCwd,
      exitCode,
      stderr,
      stdout,
      timedOut,
    };
  }

  if (exitCode === null) {
    throw new PreconditionError({
      details: {
        command,
      },
      message: "Command exited without a status code",
    });
  }

  return {
    args,
    command,
    cwd: resolvedCwd,
    exitCode,
    stderr,
    stdout,
    timedOut,
  };
};
