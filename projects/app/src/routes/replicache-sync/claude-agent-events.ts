import { asc, gt } from "drizzle-orm";
import { getDb } from "../../data/db/client";
import { claudeAgentEvents } from "../../data/db/schema";
import { putSyncedRows } from "../replicache-patch";
import { replicacheRecord } from "../replicache-records";
import type { ReplicacheSyncInput } from "./types";

export async function claudeAgentEventsSyncPatch({ sinceVersion }: ReplicacheSyncInput) {
  const rows = await getDb()
    .select()
    .from(claudeAgentEvents)
    .where(gt(claudeAgentEvents.syncVersion, sinceVersion))
    .orderBy(asc(claudeAgentEvents.createdAt), asc(claudeAgentEvents.id));

  return putSyncedRows({
    collection: "claudeAgentEvents",
    rows,
    key: (row) => `${row.createdAt}/${row.id}`,
    value: (row) => replicacheRecord.claudeAgentEvent({ row }),
  });
}
