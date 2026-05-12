import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { assertCleanWorktree, git, sourceGitRoot } from "./git";

/**
 * Create a detached git worktree at `worktreePath` pointing at `baseCommit`.
 * Idempotent: if the path already exists, it's left alone (the caller is
 * expected to track which experiment owns it). Returns the resolved repo
 * path that was used for the `git worktree add`.
 */
export async function create({
  repoPath,
  worktreePath,
  baseCommit,
  requireCleanSource = true,
}: {
  repoPath: string;
  worktreePath: string;
  baseCommit: string;
  requireCleanSource?: boolean;
}): Promise<{ resolvedRepoPath: string }> {
  const resolvedRepoPath = await sourceGitRoot({ repoPath });
  if (requireCleanSource) {
    await assertCleanWorktree({ repoPath: resolvedRepoPath, label: "source workspace" });
  }
  await mkdir(dirname(worktreePath), { recursive: true });
  if (!existsSync(worktreePath)) {
    await git({
      cwd: resolvedRepoPath,
      args: ["worktree", "add", "--detach", worktreePath, baseCommit],
    });
  }
  return { resolvedRepoPath };
}
