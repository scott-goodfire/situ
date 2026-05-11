import { asc, gt } from "drizzle-orm";
import { getDb } from "../../data/db/client";
import { workItems } from "../../data/db/schema";
import { putSyncedRows } from "../replicache-patch";
import { replicacheRecord } from "../replicache-records";
import type { ReplicacheSyncInput } from "./types";

export async function workItemsSyncPatch({ sinceVersion }: ReplicacheSyncInput) {
  const rows = await getDb()
    .select()
    .from(workItems)
    .where(gt(workItems.syncVersion, sinceVersion))
    .orderBy(asc(workItems.createdAt), asc(workItems.id));

  return putSyncedRows({
    collection: "workItems",
    rows,
    key: (row) => row.id,
    value: (row) => replicacheRecord.workItem({ row }),
  });
}
