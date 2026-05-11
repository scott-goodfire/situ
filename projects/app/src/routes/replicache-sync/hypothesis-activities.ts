import { asc, gt } from "drizzle-orm";
import { getDb } from "../../data/db/client";
import { hypothesisActivities } from "../../data/db/schema";
import { putSyncedRows } from "../replicache-patch";
import { replicacheRecord } from "../replicache-records";
import type { ReplicacheSyncInput } from "./types";

export async function hypothesisActivitiesSyncPatch({ sinceVersion }: ReplicacheSyncInput) {
  const rows = await getDb()
    .select()
    .from(hypothesisActivities)
    .where(gt(hypothesisActivities.syncVersion, sinceVersion))
    .orderBy(asc(hypothesisActivities.createdAt), asc(hypothesisActivities.id));

  return putSyncedRows({
    collection: "hypothesisActivities",
    rows,
    key: (row) => String(row.id),
    value: (row) => replicacheRecord.hypothesisActivity({ row }),
  });
}
