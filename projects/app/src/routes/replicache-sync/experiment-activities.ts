import { asc, gt } from "drizzle-orm";
import { getDb } from "../../data/db/client";
import { experimentActivities } from "../../data/db/schema";
import { putSyncedRows } from "../replicache-patch";
import { replicacheRecord } from "../replicache-records";
import type { ReplicacheSyncInput } from "./types";

export async function experimentActivitiesSyncPatch({ sinceVersion }: ReplicacheSyncInput) {
  const rows = await getDb()
    .select()
    .from(experimentActivities)
    .where(gt(experimentActivities.syncVersion, sinceVersion))
    .orderBy(asc(experimentActivities.createdAt), asc(experimentActivities.id));

  return putSyncedRows({
    collection: "experimentActivities",
    rows,
    key: (row) => String(row.id),
    value: (row) => replicacheRecord.experimentActivity({ row }),
  });
}
