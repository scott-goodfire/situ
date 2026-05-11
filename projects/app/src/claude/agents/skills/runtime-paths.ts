import { existsSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { agentSkillsDirOverride } from "../../../config/paths";

export type RuntimeSkillSource = {
  mode: "configured" | "installed" | "source";
  root: string;
};

export function resolveRuntimeSkillsRoot(): RuntimeSkillSource {
  const configured = agentSkillsDirOverride();
  if (configured) {
    return { mode: "configured", root: resolve(configured) };
  }

  const installed = installedRuntimeSkillsPath();
  if (existsSync(installed)) {
    return { mode: "installed", root: installed };
  }

  return {
    mode: "source",
    root: resolve(moduleDir(), "runtime"),
  };
}

function installedRuntimeSkillsPath(): string {
  return resolve(dirname(realExecutablePath()), "..", "share", "skills");
}

function moduleDir(): string {
  return dirname(fileURLToPath(import.meta.url));
}

function realExecutablePath(): string {
  try {
    return realpathSync(process.execPath);
  } catch {
    return process.execPath;
  }
}
