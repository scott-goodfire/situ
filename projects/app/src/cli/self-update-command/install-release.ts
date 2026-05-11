import { constants } from "node:fs";
import { access, mkdir, rename, rm, symlink } from "node:fs/promises";
import { join } from "node:path";

const textDecoder = new TextDecoder();

export async function installRelease({
  tag,
  tarballPath,
  installHome,
  binDir,
}: {
  tag: string;
  tarballPath: string;
  installHome: string;
  binDir: string;
}): Promise<string> {
  const versionsDir = join(installHome, "versions");
  const versionDir = join(versionsDir, tag);
  const tmpVersionDir = join(versionsDir, `.tmp-${tag}-${process.pid}`);
  await rm(tmpVersionDir, { recursive: true, force: true });
  await mkdir(tmpVersionDir, { recursive: true });
  await runCommand({
    cmd: ["tar", "-xzf", tarballPath, "-C", tmpVersionDir],
    description: "extract release tarball",
  });
  await access(join(tmpVersionDir, "bin", "situ"), constants.X_OK);

  await rm(versionDir, { recursive: true, force: true });
  await rename(tmpVersionDir, versionDir);

  await mkdir(installHome, { recursive: true });
  await replaceSymlink({
    path: join(installHome, "current"),
    target: join("versions", tag),
  });

  await mkdir(binDir, { recursive: true });
  await replaceSymlink({
    path: join(binDir, "situ"),
    target: join(installHome, "current", "bin", "situ"),
  });

  return versionDir;
}

async function replaceSymlink({ path, target }: { path: string; target: string }): Promise<void> {
  await rm(path, { recursive: true, force: true });
  await symlink(target, path);
}

async function runCommand({
  cmd,
  description,
}: {
  cmd: string[];
  description: string;
}): Promise<void> {
  const result = Bun.spawnSync({
    cmd,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    const stderr = textDecoder.decode(result.stderr).trim();
    throw new Error(`${description} failed${stderr ? `: ${stderr}` : ""}`);
  }
}
