import { eq } from "drizzle-orm";

import { claudeAgentRuns, claudeAgents, session as sessionTable } from "../../../data/db/schema";
import { runSyncedWrite, type SyncWriteDb } from "../../../data/db/sync";
import { dateTimeModule } from "../../../modules/date-time";
import { jsonModule } from "../../../modules/json";
import type { ManagedSessionRecord } from "../resources";

type ClaudeAgentRunUpdate = Partial<typeof claudeAgentRuns.$inferInsert>;
type ClaudeAgentStatus = (typeof claudeAgents.$inferSelect)["status"];

export function markRunRunning({
  claudeAgentRunId,
  attempt,
}: {
  claudeAgentRunId: string;
  attempt: number;
}): void {
  const updatedAt = dateTimeModule.nowIso();
  runSyncedWrite({
    write: ({ db, syncVersion }) => {
      updateClaudeAgentRun({
        db,
        claudeAgentRunId,
        values: {
          status: "running",
          attempt,
          errorMessage: null,
          syncVersion,
          updatedAt,
        },
      });
    },
  });
}

export function attachManagedSessionToRun({
  claudeAgentRunId,
  managedSession,
}: {
  claudeAgentRunId: string;
  managedSession: ManagedSessionRecord;
}): void {
  const updatedAt = dateTimeModule.nowIso();
  runSyncedWrite({
    write: ({ db, syncVersion }) => {
      updateClaudeAgentRun({
        db,
        claudeAgentRunId,
        values: {
          agentId: managedSession.agentId,
          claudeSessionId: managedSession.claudeSessionId,
          syncVersion,
          updatedAt,
        },
      });
      updateManagedSessionStatus({
        db,
        managedSession,
        status: "active",
        syncVersion,
        updatedAt,
      });
    },
  });
}

export function markRunComplete({
  claudeAgentRunId,
  managedSession,
}: {
  claudeAgentRunId: string;
  managedSession: ManagedSessionRecord;
}): void {
  const updatedAt = dateTimeModule.nowIso();
  runSyncedWrite({
    write: ({ db, syncVersion }) => {
      updateClaudeAgentRun({
        db,
        claudeAgentRunId,
        values: {
          status: "complete",
          errorMessage: null,
          syncVersion,
          updatedAt,
        },
      });
      updateManagedSessionStatus({
        db,
        managedSession,
        status: "idle",
        syncVersion,
        updatedAt,
      });
    },
  });
}

export function markRunFailed({
  claudeAgentRunId,
  error,
  managedSession,
}: {
  claudeAgentRunId: string;
  error: unknown;
  managedSession?: ManagedSessionRecord;
}): void {
  const errorText = error instanceof Error ? error.message : String(error);
  const updatedAt = dateTimeModule.nowIso();
  runSyncedWrite({
    write: ({ db, syncVersion }) => {
      updateClaudeAgentRun({
        db,
        claudeAgentRunId,
        values: {
          status: "failed",
          errorMessage: errorText,
          syncVersion,
          updatedAt,
        },
      });
      if (managedSession) {
        updateManagedSessionStatus({
          db,
          managedSession,
          status: "idle",
          syncVersion,
          updatedAt,
        });
      }
    },
  });
}

export function markRunWaitingForAction({ claudeAgentRunId }: { claudeAgentRunId: string }): void {
  const updatedAt = dateTimeModule.nowIso();
  runSyncedWrite({
    write: ({ db, syncVersion }) => {
      updateClaudeAgentRun({
        db,
        claudeAgentRunId,
        values: {
          status: "waiting_for_action",
          syncVersion,
          updatedAt,
        },
      });
    },
  });
}

export function updateRunEventCursor({
  claudeAgentRunId,
  event,
}: {
  claudeAgentRunId: string;
  event: unknown;
}): void {
  const payload = jsonModule.record({ value: event });
  const eventId = typeof payload.id === "string" ? payload.id : null;
  const updatedAt = dateTimeModule.nowIso();
  runSyncedWrite({
    write: ({ db, syncVersion }) => {
      updateClaudeAgentRun({
        db,
        claudeAgentRunId,
        values: {
          lastEventId: eventId,
          lastEventAt: updatedAt,
          syncVersion,
          updatedAt,
        },
      });
    },
  });
}

function updateClaudeAgentRun({
  db,
  claudeAgentRunId,
  values,
}: {
  db: SyncWriteDb;
  claudeAgentRunId: string;
  values: ClaudeAgentRunUpdate;
}): void {
  db.update(claudeAgentRuns).set(values).where(eq(claudeAgentRuns.id, claudeAgentRunId)).run();
}

function updateManagedSessionStatus({
  db,
  managedSession,
  status,
  syncVersion,
  updatedAt,
}: {
  db: SyncWriteDb;
  managedSession: ManagedSessionRecord;
  status: ClaudeAgentStatus;
  syncVersion: number;
  updatedAt: string;
}): void {
  db.update(claudeAgents)
    .set({ status, syncVersion, updatedAt })
    .where(eq(claudeAgents.id, managedSession.agentId))
    .run();
  db.update(sessionTable)
    .set({ syncVersion, updatedAt })
    .where(eq(sessionTable.id, managedSession.id))
    .run();
}
