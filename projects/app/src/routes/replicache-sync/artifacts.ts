import { asc, gt } from "drizzle-orm";
import { getDb } from "../../data/db/client";
import { artifacts } from "../../data/db/schema";
import { putSyncedRows } from "../replicache-patch";
import { replicacheRecord } from "../replicache-records";
import type { ReplicacheSyncInput } from "./types";

export async function artifactsSyncPatch({ sinceVersion }: ReplicacheSyncInput) {
  const rows = await getDb()
    .select()
    .from(artifacts)
    .where(gt(artifacts.syncVersion, sinceVersion))
    .orderBy(asc(artifacts.createdAt), asc(artifacts.id));

  return putSyncedRows({
    collection: "artifacts",
    rows,
    key: (row) => row.id,
    value: (row) => replicacheRecord.artifact({ row }),
  });
}
