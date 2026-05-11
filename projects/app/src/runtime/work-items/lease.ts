import { and, eq, lt } from "drizzle-orm";
import { DateTime } from "luxon";

import { getDb } from "../../data/db/client";
import { workItems, type WorkItem } from "../../data/db/schema";
import { runSyncedWrite } from "../../data/db/sync";
import { dateTimeModule } from "../../modules/date-time";
import { computeModule } from "@situ/compute";
import { failOrRetryWorkItem } from "./fail-work-item";

export async function extendWorkItemLease({
  workItem,
  leaseMs,
}: {
  workItem: WorkItem;
  leaseMs: number;
}): Promise<void> {
  const leaseExpiresAt = DateTime.utc().plus({ milliseconds: leaseMs }).toISO();
  runSyncedWrite({
    write: ({ db, syncVersion }) => {
      db.update(workItems)
        .set({ leaseExpiresAt, syncVersion, updatedAt: dateTimeModule.nowIso() })
        .where(and(eq(workItems.id, workItem.id), eq(workItems.status, "claimed")))
        .run();
    },
  });
}

export async function recoverExpiredWorkItemLeases({
  maxAttempts,
  limit,
}: {
  maxAttempts: number;
  limit: number;
}): Promise<void> {
  const stale = await getDb().query.workItems.findMany({
    where: and(
      eq(workItems.status, "claimed"),
      lt(workItems.leaseExpiresAt, dateTimeModule.nowIso()),
    ),
    limit,
  });
  for (const workItem of stale) {
    const outcome = await failOrRetryWorkItem({
      workItem,
      maxAttempts,
      error: new Error("Work item lease expired."),
    });
    if (outcome === "failed") {
      await computeModule.releaseForWorkItem({ workItem, reason: "work_item_lease_expired" });
    }
  }
}
