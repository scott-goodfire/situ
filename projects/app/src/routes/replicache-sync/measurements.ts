import { asc, gt } from "drizzle-orm";
import { getDb } from "../../data/db/client";
import { measurements } from "../../data/db/schema";
import { putSyncedRows } from "../replicache-patch";
import { replicacheRecord } from "../replicache-records";
import type { ReplicacheSyncInput } from "./types";

export async function measurementsSyncPatch({ sinceVersion }: ReplicacheSyncInput) {
  const rows = await getDb()
    .select()
    .from(measurements)
    .where(gt(measurements.syncVersion, sinceVersion))
    .orderBy(asc(measurements.createdAt), asc(measurements.id));

  return putSyncedRows({
    collection: "measurements",
    rows,
    key: (row) => row.id,
    value: (row) => replicacheRecord.measurement({ row }),
  });
}
