import { getRuntimeContext } from "../../../config/session-context";
import { getDb } from "../../../data/db/client";
import { session } from "../../../data/db/schema";
import { runSyncedWrite } from "../../../data/db/sync";
import { dateTimeModule } from "../../../modules/date-time";

export async function ensureLocalSession(): Promise<typeof session.$inferSelect> {
  const db = getDb();
  const existing = await db.query.session.findFirst();
  if (existing) {
    return existing;
  }

  const runtime = getRuntimeContext();
  const now = dateTimeModule.nowIso();
  let syncVersion = 1;
  const record = {
    id: runtime.sessionId,
    title: "situ",
    objective: "",
    repoPath: runtime.repoPath,
    workspaceKey: runtime.workspaceKey,
    status: "active" as const,
    syncVersion,
    syncDeleted: false,
    createdAt: now,
    updatedAt: now,
  };
  const writeResult = runSyncedWrite({
    write: ({ db: tx, syncVersion: version }) => {
      syncVersion = version;
      tx.insert(session)
        .values({ ...record, syncVersion: version })
        .run();
    },
  });
  syncVersion = writeResult.syncVersion;
  return {
    ...record,
    syncVersion,
    claudeSessionId: null,
    claudeEnvironmentId: null,
    closedAt: null,
  };
}
