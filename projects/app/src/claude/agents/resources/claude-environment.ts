import { eq, or } from "drizzle-orm";

import { getDb } from "../../../data/db/client";
import { claudeAgentEnvironments } from "../../../data/db/schema";
import { runSyncedWrite } from "../../../data/db/sync";
import { dateTimeModule } from "../../../modules/date-time";
import { defaultClaudeAgentBlueprint } from "../roles";
import type { ManagedAgentsBeta } from "./types";

export async function ensureClaudeAgentEnvironment({
  beta,
  existingClaudeEnvironmentId,
}: {
  beta: ManagedAgentsBeta;
  existingClaudeEnvironmentId?: string | null;
}): Promise<{
  claudeEnvironmentId: string;
}> {
  const db = getDb();
  const existing = await db.query.claudeAgentEnvironments.findFirst({
    where: eq(claudeAgentEnvironments.id, defaultClaudeAgentBlueprint.dbId),
  });
  if (existing) {
    return { claudeEnvironmentId: existing.claudeEnvironmentId };
  }
  if (existingClaudeEnvironmentId) {
    await ensureStoredClaudeAgentEnvironment({
      claudeEnvironmentId: existingClaudeEnvironmentId,
    });
    return { claudeEnvironmentId: existingClaudeEnvironmentId };
  }

  const environment = await beta.environments.create({
    name: `situ local ${dateTimeModule.nowIso()}`,
    config: {
      type: "cloud",
      networking: { type: "limited", allow_package_managers: false, allowed_hosts: [] },
    },
    description: "Default environment for local situ Managed Agent sessions.",
  });
  const now = dateTimeModule.nowIso();
  const record = runSyncedWrite({
    write: ({ db: tx, syncVersion }) => {
      const value = {
        id: defaultClaudeAgentBlueprint.dbId,
        claudeEnvironmentId: String(environment.id),
        name: String(environment.name ?? "situ local"),
        syncVersion,
        syncDeleted: false,
        createdAt: now,
        updatedAt: now,
      };
      tx.insert(claudeAgentEnvironments).values(value).run();
      return value;
    },
  }).result;
  return { claudeEnvironmentId: record.claudeEnvironmentId };
}

export async function ensureStoredClaudeAgentEnvironment({
  claudeEnvironmentId,
}: {
  claudeEnvironmentId: string;
}): Promise<void> {
  const db = getDb();
  const existing = await db.query.claudeAgentEnvironments.findFirst({
    where: or(
      eq(claudeAgentEnvironments.id, defaultClaudeAgentBlueprint.dbId),
      eq(claudeAgentEnvironments.claudeEnvironmentId, claudeEnvironmentId),
    ),
  });
  if (existing) {
    return;
  }

  const now = dateTimeModule.nowIso();
  runSyncedWrite({
    write: ({ db: tx, syncVersion }) => {
      tx.insert(claudeAgentEnvironments)
        .values({
          id: defaultClaudeAgentBlueprint.dbId,
          claudeEnvironmentId,
          name: "situ local",
          syncVersion,
          syncDeleted: false,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    },
  });
}
