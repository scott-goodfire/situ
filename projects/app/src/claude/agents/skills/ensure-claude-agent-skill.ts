import { isObjectLike } from "lodash-es";

import type { ManagedAgentsBeta } from "../resources";
import { readSkillSource, type ClaudeAgentSkillSource } from "./read-skill-source";
import { storedSkill, type ClaudeAgentSkillState, type StoredClaudeAgentSkill } from "./state";
import type {
  ClaudeAgentSkillDefinition,
  ClaudeAgentSkillSyncAction,
  ClaudeAgentSkillSyncResult,
} from "./types";

export async function ensureClaudeAgentSkill({
  beta,
  definition,
  state,
  shouldVerifyRemote,
}: {
  beta: ManagedAgentsBeta;
  definition: ClaudeAgentSkillDefinition;
  state: ClaudeAgentSkillState;
  shouldVerifyRemote: boolean;
}): Promise<{
  result: ClaudeAgentSkillSyncResult;
  stateChanged: boolean;
}> {
  const source = await readSkillSource({ definition });
  const existing = state.skills[definition.name];

  if (existing?.sourceHash === source.hash) {
    if (!shouldVerifyRemote) {
      return {
        result: syncResult({ definition, stored: existing, action: "reused" }),
        stateChanged: false,
      };
    }

    return ensureStoredSkillVersion({
      beta,
      definition,
      existing,
      source,
      state,
    });
  }

  if (existing) {
    return createSkill({
      beta,
      definition,
      source,
      state,
      action: "recreated",
    });
  }

  return createSkill({
    beta,
    definition,
    source,
    state,
    action: "created",
  });
}

async function ensureStoredSkillVersion({
  beta,
  definition,
  existing,
  source,
  state,
}: {
  beta: ManagedAgentsBeta;
  definition: ClaudeAgentSkillDefinition;
  existing: StoredClaudeAgentSkill;
  source: ClaudeAgentSkillSource;
  state: ClaudeAgentSkillState;
}): Promise<{
  result: ClaudeAgentSkillSyncResult;
  stateChanged: boolean;
}> {
  try {
    await beta.skills.versions.retrieve(existing.version, {
      skill_id: existing.skillId,
    });
    return {
      result: syncResult({ definition, stored: existing, action: "reused" }),
      stateChanged: false,
    };
  } catch (error) {
    if (!isNotFoundError({ error })) {
      throw error;
    }
  }

  return createSkill({
    beta,
    definition,
    source,
    state,
    action: "recreated",
  });
}

async function createSkill({
  beta,
  definition,
  source,
  state,
  action,
}: {
  beta: ManagedAgentsBeta;
  definition: ClaudeAgentSkillDefinition;
  source: ClaudeAgentSkillSource;
  state: ClaudeAgentSkillState;
  action: "created" | "recreated";
}): Promise<{
  result: ClaudeAgentSkillSyncResult;
  stateChanged: boolean;
}> {
  const displayTitle = displayTitleForSource({
    definition,
    sourceHash: source.hash,
  });
  let skill;
  try {
    skill = await beta.skills.create({
      display_title: displayTitle,
      files: source.files,
    });
  } catch (error) {
    if (!isDuplicateDisplayTitleError({ error })) {
      throw error;
    }
    const remote = await findRemoteSkillByDisplayTitle({
      beta,
      displayTitle,
    });
    if (!remote?.latestVersion) {
      throw error;
    }
    const stored = storedSkill({
      skillId: remote.id,
      version: remote.latestVersion,
      sourceHash: source.hash,
    });
    state.skills[definition.name] = stored;
    return {
      result: syncResult({ definition, stored, action: "reused" }),
      stateChanged: true,
    };
  }
  if (!skill.latest_version) {
    throw new Error(`Claude skill upload did not return a version: ${definition.name}`);
  }

  const stored = storedSkill({
    skillId: skill.id,
    version: skill.latest_version,
    sourceHash: source.hash,
  });
  state.skills[definition.name] = stored;
  return {
    result: syncResult({ definition, stored, action }),
    stateChanged: true,
  };
}

async function findRemoteSkillByDisplayTitle({
  beta,
  displayTitle,
}: {
  beta: ManagedAgentsBeta;
  displayTitle: string;
}): Promise<{ id: string; latestVersion: string | null } | undefined> {
  for await (const skill of beta.skills.list({ source: "custom" })) {
    if (skill.display_title === displayTitle) {
      return { id: skill.id, latestVersion: skill.latest_version };
    }
  }
  return undefined;
}

function syncResult({
  definition,
  stored,
  action,
}: {
  definition: ClaudeAgentSkillDefinition;
  stored: StoredClaudeAgentSkill;
  action: ClaudeAgentSkillSyncAction;
}): ClaudeAgentSkillSyncResult {
  return {
    name: definition.name,
    displayTitle: displayTitleForSource({ definition, sourceHash: stored.sourceHash }),
    directoryName: definition.directoryName,
    roles: definition.roles,
    skillId: stored.skillId,
    version: stored.version,
    sourceHash: stored.sourceHash,
    action,
  };
}

function displayTitleForSource({
  definition,
  sourceHash,
}: {
  definition: ClaudeAgentSkillDefinition;
  sourceHash: string;
}): string {
  return `${definition.displayTitle} ${sourceHash.slice(0, 8)}`;
}

function isNotFoundError({ error }: { error: unknown }): boolean {
  if (!isObjectLike(error)) {
    return false;
  }
  return (error as { status?: unknown }).status === 404;
}

function isDuplicateDisplayTitleError({ error }: { error: unknown }): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("display_title") && message.includes("reuse");
}
