import { asc, gt } from "drizzle-orm";
import { getDb } from "../../data/db/client";
import { claudeAgentRuns } from "../../data/db/schema";
import { putSyncedRows } from "../replicache-patch";
import { replicacheRecord } from "../replicache-records";
import type { ReplicacheSyncInput } from "./types";

export async function claudeAgentRunsSyncPatch({ sinceVersion }: ReplicacheSyncInput) {
  const rows = await getDb()
    .select()
    .from(claudeAgentRuns)
    .where(gt(claudeAgentRuns.syncVersion, sinceVersion))
    .orderBy(asc(claudeAgentRuns.createdAt), asc(claudeAgentRuns.id));

  return putSyncedRows({
    collection: "claudeAgentRuns",
    rows,
    key: (row) => row.id,
    value: (row) => replicacheRecord.claudeAgentRun({ row }),
  });
}
