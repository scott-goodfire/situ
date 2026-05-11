import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "../../data/db/client";
import { workItems } from "../../data/db/schema";
import { runSyncedWrite } from "../../data/db/sync";
import { dateTimeModule } from "../../modules/date-time";
import type { WorkItemPayload } from "./types";

export async function enqueueWorkItem({
  purpose,
  targetKind,
  targetId,
  payload = {},
  ownerAgentId,
  availableAt = dateTimeModule.nowIso(),
}: {
  purpose: string;
  targetKind: string;
  targetId: string;
  payload?: WorkItemPayload;
  ownerAgentId?: string;
  availableAt?: string;
}): Promise<{ workItemId: string; syncVersion: number }> {
  const existing = await getDb().query.workItems.findFirst({
    where: and(
      eq(workItems.purpose, purpose),
      eq(workItems.targetKind, targetKind),
      eq(workItems.targetId, targetId),
      inArray(workItems.status, ["pending", "claimed"]),
    ),
  });
  if (existing) {
    return { workItemId: existing.id, syncVersion: existing.syncVersion };
  }

  const workItemId = crypto.randomUUID();
  const now = dateTimeModule.nowIso();
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
