import { realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import { PreconditionError } from "../__shared__/precondition-error";

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
    throw new PreconditionError({
      code: "experiment_worktree_path_not_directory",
      hint: "Pass a path that resolves to a directory inside the experiment worktree.",
      details: { path },
    });
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
    throw new PreconditionError({
      code: "experiment_worktree_path_mismatch",
      hint: `Resolved paths do not match for: ${label}`,
      details: { label, left, right },
    });
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
    throw new PreconditionError({
      code: "experiment_worktree_path_required",
      hint: "Provide a non-empty experiment worktree path.",
    });
  }
  if (path.includes("\0")) {
    throw new PreconditionError({
      code: "experiment_worktree_path_invalid",
      hint: "Experiment worktree paths may not contain NUL characters.",
      details: { path },
    });
  }
}

function assertPathInside({ root, path }: { root: string; path: string }): void {
  const rel = relative(root, path);
  if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) {
    return;
  }
  throw new PreconditionError({
    code: "experiment_worktree_path_escape",
    hint: "Use a path that stays inside the experiment worktree.",
    details: { path },
  });
}
