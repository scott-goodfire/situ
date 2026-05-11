import { asc, gt } from "drizzle-orm";
import { getDb } from "../../data/db/client";
import { localSettings } from "../../data/db/schema";
import { putSyncedRows } from "../replicache-patch";
import { replicacheRecord } from "../replicache-records";
import type { ReplicacheSyncInput } from "./types";

export async function localSettingsSyncPatch({ sinceVersion }: ReplicacheSyncInput) {
  const rows = await getDb()
    .select()
    .from(localSettings)
    .where(gt(localSettings.syncVersion, sinceVersion))
    .orderBy(asc(localSettings.createdAt), asc(localSettings.id));

  return putSyncedRows({
    collection: "localSettings",
    rows,
    key: (row) => row.id,
    value: (row) => replicacheRecord.localSettings({ row }),
  });
}
