import { asc, gt } from "drizzle-orm";
import { getDb } from "../../data/db/client";
import { claudeAgents } from "../../data/db/schema";
import { putSyncedRows } from "../replicache-patch";
import { replicacheRecord } from "../replicache-records";
import type { ReplicacheSyncInput } from "./types";

export async function claudeAgentsSyncPatch({ sinceVersion }: ReplicacheSyncInput) {
  const rows = await getDb()
    .select()
    .from(claudeAgents)
    .where(gt(claudeAgents.syncVersion, sinceVersion))
    .orderBy(asc(claudeAgents.createdAt), asc(claudeAgents.id));

  return putSyncedRows({
    collection: "claudeAgents",
    rows,
    key: (row) => row.id,
    value: (row) => replicacheRecord.claudeAgent({ row }),
  });
}
