import { git } from "./git";
import type { CaptureCandidateResult } from "../types";

/**
 * Stage everything in the worktree, commit it as a candidate, and return
 * the diff against the base commit. Returns `{ isEmpty: true }` when the
 * worktree has no changes to capture; otherwise returns the new commit sha
 * plus the patch content as a string. The caller decides whether and where
 * to write the patch.
 */
export async function captureCandidate({
  worktreePath,
  baseCommit,
  commitMessage,
}: {
  worktreePath: string;
  baseCommit: string;
  commitMessage: string;
}): Promise<CaptureCandidateResult> {
  const status = await git({
    cwd: worktreePath,
    args: ["status", "--porcelain=v1", "--untracked-files=all"],
    trimStdout: true,
  });
  if (!status.trim()) {
    return { isEmpty: true, candidateCommit: null, patchContent: null };
  }

  await git({ cwd: worktreePath, args: ["add", "-A"] });
  await git({
    cwd: worktreePath,
    args: [
      "-c",
      "user.name=situ",
      "-c",
      "user.email=situ@local.invalid",
      "commit",
      "-m",
      commitMessage,
    ],
  });
  const candidateCommit = await git({
    cwd: worktreePath,
    args: ["rev-parse", "HEAD"],
    trimStdout: true,
  });
  const patchContent = await git({
    cwd: worktreePath,
    args: ["diff", "--binary", baseCommit, candidateCommit],
    trimStdout: false,
  });
  return { isEmpty: false, candidateCommit, patchContent };
}
