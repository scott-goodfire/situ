import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { localStateHome } from "../../../config/paths";
import { dateTimeModule } from "../../../modules/date-time";

export type StoredClaudeAgentSkill = {
  skillId: string;
  version: string;
  sourceHash: string;
  updatedAt: string;
};

export type ClaudeAgentSkillState = {
  schemaVersion: 1;
  skills: Record<string, StoredClaudeAgentSkill>;
};

const defaultState = (): ClaudeAgentSkillState => ({
  schemaVersion: 1,
  skills: {},
});

export async function readClaudeAgentSkillState(): Promise<ClaudeAgentSkillState> {
  try {
    const parsed = JSON.parse(
      await readFile(claudeAgentSkillStatePath(), "utf8"),
    ) as Partial<ClaudeAgentSkillState>;
    return {
      schemaVersion: 1,
      skills: parsed.skills ?? {},
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return defaultState();
    }
    throw error;
  }
}

export async function writeClaudeAgentSkillState({
  state,
}: {
  state: ClaudeAgentSkillState;
}): Promise<void> {
  const path = claudeAgentSkillStatePath();
  await mkdir(dirname(path), { recursive: true });
  const tmpPath = `${path}.${process.pid}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(state, null, 2)}\n`);
  await rename(tmpPath, path);
}

export function storedSkill({
  skillId,
  version,
  sourceHash,
}: {
  skillId: string;
  version: string;
  sourceHash: string;
}): StoredClaudeAgentSkill {
  return {
    skillId,
    version,
    sourceHash,
    updatedAt: dateTimeModule.nowIso(),
  };
}

export function claudeAgentSkillStatePath(): string {
  return join(localStateHome(), "managed-agent-skills.json");
}
