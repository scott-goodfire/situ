import { asc, gt } from "drizzle-orm";
import { getDb } from "../../data/db/client";
import { researchTasks } from "../../data/db/schema";
import { putSyncedRows } from "../replicache-patch";
import { replicacheRecord } from "../replicache-records";
import type { ReplicacheSyncInput } from "./types";

export async function researchTasksSyncPatch({ sinceVersion }: ReplicacheSyncInput) {
  const rows = await getDb()
    .select()
    .from(researchTasks)
    .where(gt(researchTasks.syncVersion, sinceVersion))
    .orderBy(asc(researchTasks.createdAt), asc(researchTasks.id));

  return putSyncedRows({
    collection: "researchTasks",
    rows,
    key: (row) => row.id,
    value: (row) => replicacheRecord.researchTask({ row }),
  });
}
