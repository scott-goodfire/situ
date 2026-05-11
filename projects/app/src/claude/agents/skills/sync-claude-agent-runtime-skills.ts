import type { ManagedAgentsBeta } from "../resources";
import { claudeAgentSkillDefinitions } from "./definitions";
import { ensureClaudeAgentSkill } from "./ensure-claude-agent-skill";
import { resolveRuntimeSkillsRoot } from "./runtime-paths";
import {
  claudeAgentSkillStatePath,
  readClaudeAgentSkillState,
  writeClaudeAgentSkillState,
} from "./state";
import type { ClaudeAgentSkillSyncReport, ClaudeAgentSkillSyncResult } from "./types";

export async function syncClaudeAgentRuntimeSkills({
  beta,
}: {
  beta: ManagedAgentsBeta;
}): Promise<ClaudeAgentSkillSyncReport> {
  const state = await readClaudeAgentSkillState();
  const skills: ClaudeAgentSkillSyncResult[] = [];
  let changed = false;

  for (const definition of claudeAgentSkillDefinitions) {
    const { result, stateChanged } = await ensureClaudeAgentSkill({
      beta,
      definition,
      state,
      shouldVerifyRemote: true,
    });
    skills.push(result);
    changed = changed || stateChanged;
  }

  if (changed) {
    await writeClaudeAgentSkillState({ state });
  }

  return {
    source: resolveRuntimeSkillsRoot(),
    statePath: claudeAgentSkillStatePath(),
    skills,
  };
}
