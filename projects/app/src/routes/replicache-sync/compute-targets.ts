import { asc, gt } from "drizzle-orm";
import { getDb } from "../../data/db/client";
import { computeTargets } from "../../data/db/schema";
import { putSyncedRows } from "../replicache-patch";
import { replicacheRecord } from "../replicache-records";
import type { ReplicacheSyncInput } from "./types";

export async function computeTargetsSyncPatch({ sinceVersion }: ReplicacheSyncInput) {
  const rows = await getDb()
    .select()
    .from(computeTargets)
    .where(gt(computeTargets.syncVersion, sinceVersion))
    .orderBy(asc(computeTargets.createdAt), asc(computeTargets.id));

  return putSyncedRows({
    collection: "computeTargets",
    rows,
    key: (row) => row.id,
    value: (row) => replicacheRecord.computeTarget({ row }),
  });
}
