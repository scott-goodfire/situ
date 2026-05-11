import { asc, gt } from "drizzle-orm";
import { getDb } from "../../data/db/client";
import { claudeAgentEnvironments } from "../../data/db/schema";
import { putSyncedRows } from "../replicache-patch";
import { replicacheRecord } from "../replicache-records";
import type { ReplicacheSyncInput } from "./types";

export async function claudeAgentEnvironmentsSyncPatch({ sinceVersion }: ReplicacheSyncInput) {
  const rows = await getDb()
    .select()
    .from(claudeAgentEnvironments)
    .where(gt(claudeAgentEnvironments.syncVersion, sinceVersion))
    .orderBy(asc(claudeAgentEnvironments.createdAt), asc(claudeAgentEnvironments.id));

  return putSyncedRows({
    collection: "claudeAgentEnvironments",
    rows,
    key: (row) => row.id,
    value: (row) => replicacheRecord.claudeAgentEnvironment({ row }),
  });
}
