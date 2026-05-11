import { asc, gt } from "drizzle-orm";
import { getDb } from "../../data/db/client";
import { feedEntries } from "../../data/db/schema";
import { putSyncedRows } from "../replicache-patch";
import { replicacheRecord } from "../replicache-records";
import type { ReplicacheSyncInput } from "./types";

export async function feedEntriesSyncPatch({ sinceVersion }: ReplicacheSyncInput) {
  const rows = await getDb()
    .select()
    .from(feedEntries)
    .where(gt(feedEntries.syncVersion, sinceVersion))
    .orderBy(asc(feedEntries.createdAt), asc(feedEntries.id));

  return putSyncedRows({
    collection: "feedEntries",
    rows,
    key: (row) => row.id,
    value: (row) => replicacheRecord.feedEntry({ row }),
  });
}
