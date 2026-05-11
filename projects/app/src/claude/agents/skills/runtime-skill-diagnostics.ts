import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { claudeAgentSkillDefinitions } from "./definitions";
import { resolveRuntimeSkillsRoot } from "./runtime-paths";
import { claudeAgentSkillStatePath } from "./state";
import type { RuntimeSkillDiagnostics } from "./types";

export function runtimeSkillDiagnostics(): RuntimeSkillDiagnostics {
  const source = resolveRuntimeSkillsRoot();
  const skills = claudeAgentSkillDefinitions.map((definition) => {
    const path = resolve(source.root, definition.directoryName, "SKILL.md");
    return {
      name: definition.name,
      directoryName: definition.directoryName,
      path,
      isPresent: existsSync(path),
      roles: definition.roles,
    };
  });
  const missing = skills.filter((skill) => !skill.isPresent).map((skill) => skill.path);

  return {
    source,
    statePath: claudeAgentSkillStatePath(),
    isPresent: missing.length === 0,
    missing,
    skills,
  };
}
