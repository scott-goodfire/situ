import { asc, gt } from "drizzle-orm";
import { getDb } from "../../data/db/client";
import { researchTaskVerifications } from "../../data/db/schema";
import { putSyncedRows } from "../replicache-patch";
import { replicacheRecord } from "../replicache-records";
import type { ReplicacheSyncInput } from "./types";

export async function researchTaskVerificationsSyncPatch({ sinceVersion }: ReplicacheSyncInput) {
  const rows = await getDb()
    .select()
    .from(researchTaskVerifications)
    .where(gt(researchTaskVerifications.syncVersion, sinceVersion))
    .orderBy(asc(researchTaskVerifications.createdAt), asc(researchTaskVerifications.id));

  return putSyncedRows({
    collection: "researchTaskVerifications",
    rows,
    key: (row) => row.id,
    value: (row) => replicacheRecord.researchTaskVerification({ row }),
  });
}
