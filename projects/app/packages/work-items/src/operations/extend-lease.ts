import { and, eq } from "drizzle-orm";
import { DateTime } from "luxon";

import { getWorkItemsContext } from "../context";
import { workItems } from "../schema";
import { nowIso } from "../__shared__";
import type { WorkItem } from "../types";

export async function extendLease({
  workItem,
  leaseMs,
}: {
  workItem: WorkItem;
  leaseMs: number;
}): Promise<void> {
  const { runSyncedWrite } = getWorkItemsContext();
  const leaseExpiresAt = DateTime.utc().plus({ milliseconds: leaseMs }).toISO();
  runSyncedWrite({
    write: ({ db, syncVersion }) => {
      db.update(workItems)
        .set({ leaseExpiresAt, syncVersion, updatedAt: nowIso() })
        .where(and(eq(workItems.id, workItem.id), eq(workItems.status, "claimed")))
        .run();
    },
  });
}
