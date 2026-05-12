export async function git({
  cwd,
  args,
  trimStdout = true,
}: {
  cwd: string;
  args: string[];
  trimStdout?: boolean;
}): Promise<string> {
  const result = Bun.spawnSync({
    cmd: ["git", ...args],
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const rawStdout = new TextDecoder().decode(result.stdout);
  const stdout = trimStdout ? rawStdout.trim() : rawStdout;
  const stderr = new TextDecoder().decode(result.stderr).trim();
  if (result.exitCode !== 0) {
    throw new Error(stderr || `git ${args.join(" ")} failed`);
  }
  return stdout;
}

export async function sourceGitRoot({ repoPath }: { repoPath: string }): Promise<string> {
  return git({
    cwd: repoPath,
    args: ["rev-parse", "--show-toplevel"],
    trimStdout: true,
  });
}

export async function assertCleanWorktree({
  repoPath,
  label,
}: {
  repoPath: string;
  label: string;
}): Promise<void> {
  const status = await git({
    cwd: repoPath,
    args: ["status", "--porcelain=v1", "--untracked-files=all"],
    trimStdout: true,
  });
  if (status.trim()) {
    throw new Error(`${label} has uncommitted changes.`);
  }
}

export async function changedFiles({ worktreePath }: { worktreePath: string }): Promise<string[]> {
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
