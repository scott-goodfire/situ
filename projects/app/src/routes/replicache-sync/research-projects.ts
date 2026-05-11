import { asc, gt } from "drizzle-orm";
import { getDb } from "../../data/db/client";
import { researchProjects } from "../../data/db/schema";
import { putSyncedRows } from "../replicache-patch";
import { replicacheRecord } from "../replicache-records";
import type { ReplicacheSyncInput } from "./types";

export async function researchProjectsSyncPatch({ sinceVersion }: ReplicacheSyncInput) {
  const rows = await getDb()
    .select()
    .from(researchProjects)
    .where(gt(researchProjects.syncVersion, sinceVersion))
    .orderBy(asc(researchProjects.createdAt), asc(researchProjects.id));

  return putSyncedRows({
    collection: "researchProjects",
    rows,
    key: (row) => row.id,
    value: (row) => replicacheRecord.researchProject({ row }),
  });
}
