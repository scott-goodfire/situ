import { asc, gt } from "drizzle-orm";
import { getDb } from "../../data/db/client";
import { baselines } from "../../data/db/schema";
import { putSyncedRows } from "../replicache-patch";
import { replicacheRecord } from "../replicache-records";
import type { ReplicacheSyncInput } from "./types";

export async function baselinesSyncPatch({ sinceVersion }: ReplicacheSyncInput) {
  const rows = await getDb()
    .select()
    .from(baselines)
    .where(gt(baselines.syncVersion, sinceVersion))
    .orderBy(asc(baselines.createdAt), asc(baselines.id));

  return putSyncedRows({
    collection: "baselines",
    rows,
    key: (row) => row.id,
    value: (row) => replicacheRecord.baseline({ row }),
  });
}
