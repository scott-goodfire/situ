import type { BetaManagedAgentsSkillParams } from "@anthropic-ai/sdk/resources/beta/agents";

import type { ClaudeAgentBlueprint } from "../roles";
import type { ManagedAgentsBeta } from "../resources";
import { claudeAgentSkillDefinitionByName } from "./definitions";
import { ensureClaudeAgentSkill } from "./ensure-claude-agent-skill";
import { readClaudeAgentSkillState, writeClaudeAgentSkillState } from "./state";

export async function claudeAgentSkillParamsForBlueprint({
  beta,
  blueprint,
}: {
  beta: ManagedAgentsBeta;
  blueprint: ClaudeAgentBlueprint;
}): Promise<BetaManagedAgentsSkillParams[]> {
  const definitions = blueprint.skillNames.map((name) =>
    claudeAgentSkillDefinitionByName({ name }),
  );
  const state = await readClaudeAgentSkillState();
  const params: BetaManagedAgentsSkillParams[] = [];
  let changed = false;

  for (const definition of definitions) {
    if (!definition.roles.includes(blueprint.role)) {
      throw new Error(
        `Claude agent skill ${definition.name} is not registered for ${blueprint.role}`,
      );
    }
    const { result, stateChanged } = await ensureClaudeAgentSkill({
      beta,
      definition,
      state,
      shouldVerifyRemote: true,
    });
    params.push({
      type: "custom",
      skill_id: result.skillId,
      version: result.version,
    });
    changed = changed || stateChanged;
  }

  if (changed) {
    await writeClaudeAgentSkillState({ state });
  }

  return params;
}
