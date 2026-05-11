export async function sourceGitRoot({ repoPath }: { repoPath: string }): Promise<string> {
  return git({
    cwd: repoPath,
    args: ["rev-parse", "--show-toplevel"],
    trimStdout: true,
  });
}

export async function assertCleanGitWorktree({
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
