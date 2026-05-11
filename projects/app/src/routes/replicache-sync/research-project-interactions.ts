import { asc, gt } from "drizzle-orm";
import { getDb } from "../../data/db/client";
import { researchProjectInteractions } from "../../data/db/schema";
import { putSyncedRows } from "../replicache-patch";
import { replicacheRecord } from "../replicache-records";
import type { ReplicacheSyncInput } from "./types";

export async function researchProjectInteractionsSyncPatch({ sinceVersion }: ReplicacheSyncInput) {
  const rows = await getDb()
    .select()
    .from(researchProjectInteractions)
    .where(gt(researchProjectInteractions.syncVersion, sinceVersion))
    .orderBy(asc(researchProjectInteractions.createdAt), asc(researchProjectInteractions.id));

  return putSyncedRows({
    collection: "researchProjectInteractions",
    rows,
    key: (row) => row.id,
    value: (row) => replicacheRecord.researchProjectInteraction({ row }),
  });
}
