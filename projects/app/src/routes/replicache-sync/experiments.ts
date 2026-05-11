import { asc, gt } from "drizzle-orm";
import { getDb } from "../../data/db/client";
import { experiments } from "../../data/db/schema";
import { putSyncedRows } from "../replicache-patch";
import { replicacheRecord } from "../replicache-records";
import type { ReplicacheSyncInput } from "./types";

export async function experimentsSyncPatch({ sinceVersion }: ReplicacheSyncInput) {
  const rows = await getDb()
    .select()
    .from(experiments)
    .where(gt(experiments.syncVersion, sinceVersion))
    .orderBy(asc(experiments.createdAt), asc(experiments.id));

  return putSyncedRows({
    collection: "experiments",
    rows,
    key: (row) => row.id,
    value: (row) => replicacheRecord.experiment({ row }),
  });
}
