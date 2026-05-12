import { and, eq, inArray } from "drizzle-orm";

import { getWorkItemsContext } from "../context";
import { workItems } from "../schema";
import { nowIso } from "../__shared__";
import type { WorkItemPayload } from "../types";

export async function enqueue({
  purpose,
  targetKind,
  targetId,
  payload = {},
  ownerAgentId,
  availableAt = nowIso(),
}: {
  purpose: string;
  targetKind: string;
  targetId: string;
  payload?: WorkItemPayload;
  ownerAgentId?: string;
  availableAt?: string;
}): Promise<{ workItemId: string; syncVersion: number }> {
  const { getDb, runSyncedWrite } = getWorkItemsContext();
  const db = getDb();
  const [existing] = await db
    .select()
    .from(workItems)
    .where(
      and(
        eq(workItems.purpose, purpose),
        eq(workItems.targetKind, targetKind),
        eq(workItems.targetId, targetId),
        inArray(workItems.status, ["pending", "claimed"]),
      ),
    )
    .limit(1);
  if (existing) {
    return { workItemId: existing.id, syncVersion: existing.syncVersion };
  }

  const workItemId = crypto.randomUUID();
  const now = nowIso();
  const { syncVersion } = runSyncedWrite({
    write: ({ db: tx, syncVersion: version }) => {
      tx.insert(workItems)
        .values({
          id: workItemId,
          purpose,
          targetKind,
          targetId,
          status: "pending",
          ownerAgentId,
          availableAt,
          payloadJson: JSON.stringify(payload),
          syncVersion: version,
          syncDeleted: false,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    },
  });
  return { workItemId, syncVersion };
}
