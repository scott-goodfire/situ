import { eq } from "drizzle-orm";

import { getDb } from "../../../data/db/client";
import { claudeAgents, session as sessionTable } from "../../../data/db/schema";
import { runSyncedWrite } from "../../../data/db/sync";
import { logModule } from "../../../modules/log";
import { obs } from "../../../observability";
import { dateTimeModule } from "../../../modules/date-time";
import { getAnthropicClient } from "../anthropic-client";
import {
  claudeAgentBlueprintForRole,
  type ClaudeAgentBlueprint,
  type ClaudeAgentExecutionMode,
  type ClaudeAgentRole,
} from "../roles";
import { ensureClaudeAgent } from "./claude-agent";
import {
  ensureClaudeAgentEnvironment,
  ensureStoredClaudeAgentEnvironment,
} from "./claude-environment";
import { ensureClaudeMemoryStore, MEMORY_STORE_INSTRUCTIONS } from "./claude-memory-store";
import { ensureLocalSession } from "./local-session";
import type { ManagedSessionRecord } from "./types";

export async function ensureManagedSession(): Promise<ManagedSessionRecord> {
  return ensureManagedSessionForRole({ role: "manager" });
}

export async function createIsolatedManagedSessionForRole({
  role,
  executionMode,
  modelOverride,
}: {
  role: ClaudeAgentRole;
  executionMode?: ClaudeAgentExecutionMode;
  modelOverride?: string;
}): Promise<ManagedSessionRecord> {
  const localSession = await ensureLocalSession();
  const managedSession = await createClaudeManagedSession({
    blueprint: claudeAgentBlueprintForRole({ role, executionMode, modelOverride }),
    existingClaudeEnvironmentId: localSession.claudeEnvironmentId,
  });
  if (!localSession.claudeEnvironmentId) {
    const now = dateTimeModule.nowIso();
    runSyncedWrite({
      write: ({ db: tx, syncVersion }) => {
        tx.update(sessionTable)
          .set({
            claudeEnvironmentId: managedSession.claudeEnvironmentId,
            syncVersion,
            updatedAt: now,
          })
          .where(eq(sessionTable.id, localSession.id))
          .run();
      },
    });
  }
  return {
    id: localSession.id,
    ...managedSession,
  };
}

export async function ensureManagedSessionForRole({
  role,
  executionMode,
  modelOverride,
}: {
  role: ClaudeAgentRole;
  executionMode?: ClaudeAgentExecutionMode;
  modelOverride?: string;
}): Promise<ManagedSessionRecord> {
  const db = getDb();
  const localSession = await ensureLocalSession();
  const blueprint = claudeAgentBlueprintForRole({ role, executionMode, modelOverride });
  const existingAgent = await db.query.claudeAgents.findFirst({
    where: eq(claudeAgents.id, blueprint.dbId),
  });
  if (
    existingAgent?.claudeSessionId &&
    localSession.claudeEnvironmentId &&
    existingAgent?.claudeAgentId
  ) {
    await ensureStoredClaudeAgentEnvironment({
      claudeEnvironmentId: localSession.claudeEnvironmentId,
    });
    if (role === "manager" && localSession.claudeSessionId !== existingAgent.claudeSessionId) {
      runSyncedWrite({
        write: ({ db: tx, syncVersion }) => {
          tx.update(sessionTable)
            .set({
              claudeSessionId: existingAgent.claudeSessionId,
              syncVersion,
              updatedAt: dateTimeModule.nowIso(),
            })
            .where(eq(sessionTable.id, localSession.id))
            .run();
        },
      });
    }
    return {
      id: localSession.id,
      agentId: existingAgent.id,
      claudeSessionId: existingAgent.claudeSessionId,
      claudeAgentId: existingAgent.claudeAgentId,
      claudeEnvironmentId: localSession.claudeEnvironmentId,
    };
  }

  const managedSession = await createClaudeManagedSession({
    blueprint,
    existingClaudeEnvironmentId: localSession.claudeEnvironmentId,
  });
  persistManagedSession({
    localSession,
    managedSession,
    role,
  });

  return {
    id: localSession.id,
    ...managedSession,
  };
}

export async function replaceManagedSession({
  reason,
  role = "manager",
  executionMode,
}: {
  reason: string;
  role?: ClaudeAgentRole;
  executionMode?: ClaudeAgentExecutionMode;
}): Promise<ManagedSessionRecord> {
  const localSession = await ensureLocalSession();
  const managedSession = await createClaudeManagedSession({
    blueprint: claudeAgentBlueprintForRole({ role, executionMode }),
    existingClaudeEnvironmentId: localSession.claudeEnvironmentId,
  });
  persistManagedSession({
    localSession,
    managedSession,
    role,
    agentStatus: "idle",
  });

  logModule.info(obs.log.claude.sessionReplaced, {
    reason,
    [obs.attr.claude.sessionId]: managedSession.claudeSessionId,
  });
  return {
    id: localSession.id,
    ...managedSession,
  };
}

function persistManagedSession({
  localSession,
  managedSession,
  role,
  agentStatus,
}: {
  localSession: Awaited<ReturnType<typeof ensureLocalSession>>;
  managedSession: Omit<ManagedSessionRecord, "id">;
  role: ClaudeAgentRole;
  agentStatus?: "idle";
}): void {
  const now = dateTimeModule.nowIso();
  runSyncedWrite({
    write: ({ db: tx, syncVersion }) => {
      if (role === "manager") {
        tx.update(sessionTable)
          .set({
            claudeSessionId: managedSession.claudeSessionId,
            claudeEnvironmentId: managedSession.claudeEnvironmentId,
            syncVersion,
            updatedAt: now,
          })
          .where(eq(sessionTable.id, localSession.id))
          .run();
      } else if (!localSession.claudeEnvironmentId) {
        tx.update(sessionTable)
          .set({
            claudeEnvironmentId: managedSession.claudeEnvironmentId,
            syncVersion,
            updatedAt: now,
          })
          .where(eq(sessionTable.id, localSession.id))
          .run();
      }

      tx.update(claudeAgents)
        .set({
          claudeSessionId: managedSession.claudeSessionId,
          ...(agentStatus ? { status: agentStatus } : {}),
          syncVersion,
          updatedAt: now,
        })
        .where(eq(claudeAgents.id, managedSession.agentId))
        .run();
    },
  });
}

async function createClaudeManagedSession({
  blueprint,
  existingClaudeEnvironmentId,
}: {
  blueprint: ClaudeAgentBlueprint;
  existingClaudeEnvironmentId?: string | null;
}): Promise<Omit<ManagedSessionRecord, "id">> {
  const client = await getAnthropicClient();
  const beta = client.beta;
  const agent = await ensureClaudeAgent({
    beta,
    blueprint,
  });
  const environment = await ensureClaudeAgentEnvironment({
    beta,
    existingClaudeEnvironmentId,
  });
  const resources =
    blueprint.role === "manager"
      ? [
          {
            type: "memory_store" as const,
            memory_store_id: (await ensureClaudeMemoryStore({ beta })).claudeMemoryStoreId,
            access: "read_write" as const,
            instructions: MEMORY_STORE_INSTRUCTIONS,
          },
        ]
      : undefined;
  const claudeSession = await beta.sessions.create({
    agent: agent.claudeAgentId,
    environment_id: environment.claudeEnvironmentId,
    title: "situ",
    ...(resources ? { resources } : {}),
  });
  return {
    agentId: agent.id,
    claudeSessionId: String(claudeSession.id),
    claudeAgentId: agent.claudeAgentId,
    claudeEnvironmentId: environment.claudeEnvironmentId,
  };
}
