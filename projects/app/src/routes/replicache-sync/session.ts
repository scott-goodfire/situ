import { asc, gt } from "drizzle-orm";
import type { PatchOperation } from "replicache";
import { getDb } from "../../data/db/client";
import { session, type Session } from "../../data/db/schema";
import { putSyncedRows } from "../replicache-patch";
import { replicacheRecord } from "../replicache-records";
import type { ReplicacheSyncInput } from "./types";

export type SessionSyncPatch = {
  currentSession: Session | null;
  patch: PatchOperation[];
};

export async function sessionSyncPatch({
  sinceVersion,
}: ReplicacheSyncInput): Promise<SessionSyncPatch> {
  const db = getDb();
  const rows = await db
    .select()
    .from(session)
    .where(gt(session.syncVersion, sinceVersion))
    .orderBy(asc(session.createdAt), asc(session.id));
  const currentSession =
    rows.find((row) => !row.syncDeleted) ?? (await db.query.session.findFirst()) ?? null;

  return {
    currentSession,
    patch: putSyncedRows({
      collection: "session",
      rows,
      key: () => "current",
      value: (row) => replicacheRecord.session({ row }),
    }),
  };
}
