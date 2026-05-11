import { asc, gt } from "drizzle-orm";
import { getDb } from "../../data/db/client";
import { baselineActivities } from "../../data/db/schema";
import { putSyncedRows } from "../replicache-patch";
import { replicacheRecord } from "../replicache-records";
import type { ReplicacheSyncInput } from "./types";

export async function baselineActivitiesSyncPatch({ sinceVersion }: ReplicacheSyncInput) {
  const rows = await getDb()
    .select()
    .from(baselineActivities)
    .where(gt(baselineActivities.syncVersion, sinceVersion))
    .orderBy(asc(baselineActivities.createdAt), asc(baselineActivities.id));

  return putSyncedRows({
    collection: "baselineActivities",
    rows,
    key: (row) => String(row.id),
    value: (row) => replicacheRecord.baselineActivity({ row }),
  });
}
