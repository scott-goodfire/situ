import { realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

export async function inferInstallHome(): Promise<string | undefined> {
  try {
    const execPath = await realpath(process.execPath);
    const executableName = basename(execPath);
    if (executableName !== "situ") {
      return undefined;
    }
    const binDir = dirname(execPath);
    const versionDir = dirname(binDir);
    const versionsDir = dirname(versionDir);
    if (basename(versionsDir) !== "versions") {
      return undefined;
    }
    return dirname(versionsDir);
  } catch {
    return undefined;
  }
}

export function defaultInstallHome(): string {
  return join(homedir(), ".local", "share", "situ");
}

export function defaultBinDir(): string {
  return join(homedir(), ".local", "bin");
}
