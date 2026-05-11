import { asc, gt } from "drizzle-orm";
import { getDb } from "../../data/db/client";
import { evaluations } from "../../data/db/schema";
import { putSyncedRows } from "../replicache-patch";
import { replicacheRecord } from "../replicache-records";
import type { ReplicacheSyncInput } from "./types";

export async function evaluationsSyncPatch({ sinceVersion }: ReplicacheSyncInput) {
  const rows = await getDb()
    .select()
    .from(evaluations)
    .where(gt(evaluations.syncVersion, sinceVersion))
    .orderBy(asc(evaluations.createdAt), asc(evaluations.id));

  return putSyncedRows({
    collection: "evaluations",
    rows,
    key: (row) => row.id,
    value: (row) => replicacheRecord.evaluation({ row }),
  });
}
