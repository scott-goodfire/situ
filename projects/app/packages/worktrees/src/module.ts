import {
  assertCleanWorktree,
  assertSameRealPath,
  captureCandidate,
  changedFiles,
  commandOutputEnv,
  create,
  git,
  resolveWorkspaceDirectory,
  runCommand,
  sourceGitRoot,
} from "./operations";

/**
 * Single namespace object for worktree operations. Mirrors situ's
 * `jsonModule`, `textModule`, `dateTimeModule`, `computeModule` convention.
 *
 * All operations are pure functions — no `configure` call, no DI. The
 * package has zero static dependency on `@situ/app`.
 */
export const worktreeModule = {
  create,
  captureCandidate,
  runCommand,
  changedFiles,
  git,
  sourceGitRoot,
  assertCleanWorktree,
  commandOutputEnv,
  resolveWorkspaceDirectory,
  assertSameRealPath,
} as const;
