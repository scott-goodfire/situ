import { asc, gt } from "drizzle-orm";
import { getDb } from "../../data/db/client";
import { hypotheses } from "../../data/db/schema";
import { putSyncedRows } from "../replicache-patch";
import { replicacheRecord } from "../replicache-records";
import type { ReplicacheSyncInput } from "./types";

export async function hypothesesSyncPatch({ sinceVersion }: ReplicacheSyncInput) {
  const rows = await getDb()
    .select()
    .from(hypotheses)
    .where(gt(hypotheses.syncVersion, sinceVersion))
    .orderBy(asc(hypotheses.createdAt), asc(hypotheses.id));

  return putSyncedRows({
    collection: "hypotheses",
    rows,
    key: (row) => row.id,
    value: (row) => replicacheRecord.hypothesis({ row }),
  });
}
