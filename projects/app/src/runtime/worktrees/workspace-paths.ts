import { realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

export async function resolveWorkspaceDirectory({
  workspaceRoot,
  path,
}: {
  workspaceRoot: string;
  path: string;
}): Promise<string> {
  const resolvedPath = await resolveWorkspacePath({
    workspaceRoot,
    path,
    mustExist: true,
  });
  const pathStat = await stat(resolvedPath);
  if (!pathStat.isDirectory()) {
    throw new Error(`Workspace path is not a directory: ${path}`);
  }
  return resolvedPath;
}

export async function assertSameRealPath({
  left,
  right,
  label,
}: {
  left: string;
  right: string;
  label: string;
}): Promise<void> {
  const [leftRealPath, rightRealPath] = await Promise.all([realpath(left), realpath(right)]);
  if (leftRealPath !== rightRealPath) {
    throw new Error(`${label}: ${left}`);
  }
}

async function resolveWorkspacePath({
  workspaceRoot,
  path,
  mustExist,
}: {
  workspaceRoot: string;
  path: string;
  mustExist: boolean;
}): Promise<string> {
  assertWorkspacePath({ path });
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

function assertWorkspacePath({ path }: { path: string }): void {
  if (!path.trim()) {
    throw new Error("Experiment workspace path is required.");
  }
  if (path.includes("\0")) {
    throw new Error(`Workspace path contains an invalid character: ${path}`);
  }
}

function assertPathInside({ root, path }: { root: string; path: string }): void {
  const rel = relative(root, path);
  if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) {
    return;
  }
  throw new Error(`Workspace path escapes experiment worktree: ${path}`);
}
