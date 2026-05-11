import { asc, gt } from "drizzle-orm";
import { getDb } from "../../data/db/client";
import { evaluationActivities } from "../../data/db/schema";
import { putSyncedRows } from "../replicache-patch";
import { replicacheRecord } from "../replicache-records";
import type { ReplicacheSyncInput } from "./types";

export async function evaluationActivitiesSyncPatch({ sinceVersion }: ReplicacheSyncInput) {
  const rows = await getDb()
    .select()
    .from(evaluationActivities)
    .where(gt(evaluationActivities.syncVersion, sinceVersion))
    .orderBy(asc(evaluationActivities.createdAt), asc(evaluationActivities.id));

  return putSyncedRows({
    collection: "evaluationActivities",
    rows,
    key: (row) => String(row.id),
    value: (row) => replicacheRecord.evaluationActivity({ row }),
  });
}
