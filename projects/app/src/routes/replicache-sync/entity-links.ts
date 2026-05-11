import { asc, gt } from "drizzle-orm";
import { getDb } from "../../data/db/client";
import { entityLinks } from "../../data/db/schema";
import { putSyncedRows } from "../replicache-patch";
import { replicacheRecord } from "../replicache-records";
import type { ReplicacheSyncInput } from "./types";

export async function entityLinksSyncPatch({ sinceVersion }: ReplicacheSyncInput) {
  const rows = await getDb()
    .select()
    .from(entityLinks)
    .where(gt(entityLinks.syncVersion, sinceVersion))
    .orderBy(asc(entityLinks.createdAt), asc(entityLinks.id));

  return putSyncedRows({
    collection: "entityLinks",
    rows,
    key: (row) => row.id,
    value: (row) => replicacheRecord.entityLink({ row }),
  });
}
