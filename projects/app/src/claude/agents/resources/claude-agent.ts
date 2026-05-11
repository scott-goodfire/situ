import type {
  BetaManagedAgentsAgent,
  BetaManagedAgentsSkillParams,
  BetaManagedAgentsAgentToolset20260401Params,
  BetaManagedAgentsCustomToolParams,
} from "@anthropic-ai/sdk/resources/beta/agents";
import { eq } from "drizzle-orm";

import { getDb } from "../../../data/db/client";
import { claudeAgents } from "../../../data/db/schema";
import { runSyncedWrite } from "../../../data/db/sync";
import { dateTimeModule } from "../../../modules/date-time";
import type { ClaudeAgentBlueprint } from "../roles";
import { claudeAgentSkillParamsForBlueprint } from "../skills";
import { claudeAgentToolParamsForRole } from "../tools";
import type { ManagedAgentsBeta } from "./types";

export async function ensureClaudeAgent({
  beta,
  blueprint,
}: {
  beta: ManagedAgentsBeta;
  blueprint: ClaudeAgentBlueprint;
}): Promise<{
  id: string;
  claudeAgentId: string;
}> {
  const db = getDb();
  const existing = await db.query.claudeAgents.findFirst({
    where: eq(claudeAgents.id, blueprint.dbId),
  });
  const expectedSkills = await claudeAgentSkillParamsForBlueprint({ beta, blueprint });
  if (existing?.claudeAgentId) {
    const remoteAgent = await beta.agents.retrieve(existing.claudeAgentId);
    if (claudeAgentNeedsUpdate({ remoteAgent, blueprint, expectedSkills })) {
      const updatedAgent = await beta.agents.update(existing.claudeAgentId, {
        version: remoteAgent.version,
        model: blueprint.model,
        skills: expectedSkills,
        system: blueprint.system,
        tools: claudeAgentToolsForBlueprint({ blueprint }),
      });
      await upsertClaudeAgentRecord({ blueprint, claudeAgent: updatedAgent, existing });
    }
    return { id: existing.id, claudeAgentId: existing.claudeAgentId };
  }

  const claudeAgent = await beta.agents.create({
    name: `${blueprint.displayName} ${dateTimeModule.nowIso()}`,
    model: blueprint.model,
    skills: expectedSkills,
    system: blueprint.system,
    tools: claudeAgentToolsForBlueprint({ blueprint }),
  });
  await upsertClaudeAgentRecord({ blueprint, claudeAgent, existing });
  return { id: blueprint.dbId, claudeAgentId: String(claudeAgent.id) };
}

export function claudeAgentToolsForBlueprint({
  blueprint,
}: {
  blueprint: ClaudeAgentBlueprint;
}): Array<BetaManagedAgentsAgentToolset20260401Params | BetaManagedAgentsCustomToolParams> {
  return [
    {
      type: "agent_toolset_20260401",
      default_config: { enabled: blueprint.defaultToolsetEnabled },
      configs: [
        {
          name: "read",
          enabled: true,
          permission_policy: { type: "always_allow" },
        },
      ],
    },
    ...claudeAgentToolParamsForRole({ role: blueprint.role }),
  ];
}

function claudeAgentNeedsUpdate({
  remoteAgent,
  blueprint,
  expectedSkills,
}: {
  remoteAgent: BetaManagedAgentsAgent;
  blueprint: ClaudeAgentBlueprint;
  expectedSkills: BetaManagedAgentsSkillParams[];
}): boolean {
  if (remoteAgent.model.id !== blueprint.model) {
    return true;
  }
  if (remoteAgent.system !== blueprint.system) {
    return true;
  }

  const remoteToolset = remoteAgent.tools.find((tool) => tool.type === "agent_toolset_20260401");
  if (remoteToolset?.default_config.enabled !== blueprint.defaultToolsetEnabled) {
    return true;
  }
  const remoteReadConfig = remoteToolset.configs.find((config) => config.name === "read");
  if (
    remoteReadConfig?.enabled !== true ||
    remoteReadConfig.permission_policy.type !== "always_allow"
  ) {
    return true;
  }

  const expectedToolKeys = claudeAgentToolParamsForRole({
    role: blueprint.role,
  }).map(customToolKey);
  const actualToolKeys = remoteAgent.tools
    .filter((tool) => tool.type === "custom")
    .map(customToolKey);
  if (!sameStringSet({ left: expectedToolKeys, right: actualToolKeys })) {
    return true;
  }

  const expectedSkillKeys = expectedSkills.map(skillKey);
  const actualSkillKeys = remoteAgent.skills.map(skillKey);
  return !sameStringSet({ left: expectedSkillKeys, right: actualSkillKeys });
}

async function upsertClaudeAgentRecord({
  blueprint,
  claudeAgent,
  existing,
}: {
  blueprint: ClaudeAgentBlueprint;
  claudeAgent: BetaManagedAgentsAgent;
  existing?: typeof claudeAgents.$inferSelect;
}): Promise<void> {
  const now = dateTimeModule.nowIso();
  runSyncedWrite({
    write: ({ db, syncVersion }) => {
      const record = {
        id: blueprint.dbId,
        kind: blueprint.role,
        displayName: blueprint.displayName,
        claudeAgentId: String(claudeAgent.id),
        claudeAgentVersion: typeof claudeAgent.version === "number" ? claudeAgent.version : null,
        model: blueprint.model,
        status: "idle" as const,
        syncVersion,
        syncDeleted: false,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      if (existing) {
        db.update(claudeAgents).set(record).where(eq(claudeAgents.id, existing.id)).run();
        return;
      }
      db.insert(claudeAgents).values(record).run();
    },
  });
}

function skillKey({
  type,
  skill_id,
  version,
}: {
  type: string;
  skill_id: string;
  version?: string | null;
}): string {
  return `${type}:${skill_id}:${version ?? ""}`;
}

function customToolKey({
  type,
  name,
  description,
  input_schema,
}: {
  type?: string;
  name?: string;
  description?: string;
  input_schema?: unknown;
}): string {
  return stableJson({
    type,
    name,
    description,
    input_schema,
  });
}

function stableJson(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableValue(nested)]),
    );
  }
  return value;
}

function sameStringSet({
  left,
  right,
}: {
  left: readonly string[];
  right: readonly string[];
}): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}
