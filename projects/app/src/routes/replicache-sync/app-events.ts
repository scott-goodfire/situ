import { asc, gt } from "drizzle-orm";
import { getDb } from "../../data/db/client";
import { appEvents } from "../../data/db/schema";
import { putSyncedRows } from "../replicache-patch";
import { replicacheRecord } from "../replicache-records";
import type { ReplicacheSyncInput } from "./types";

export async function appEventsSyncPatch({ sinceVersion }: ReplicacheSyncInput) {
  const rows = await getDb()
    .select()
    .from(appEvents)
    .where(gt(appEvents.syncVersion, sinceVersion))
    .orderBy(asc(appEvents.createdAt), asc(appEvents.id));

  return putSyncedRows({
    collection: "appEvents",
    rows,
    key: (row) => String(row.id),
    value: (row) => replicacheRecord.appEvent({ row }),
  });
}
