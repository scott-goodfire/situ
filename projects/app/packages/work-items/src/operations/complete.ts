import { eq } from "drizzle-orm";

import { getWorkItemsContext } from "../context";
import { workItems } from "../schema";
import { nowIso } from "../__shared__";
import type { WorkItem } from "../types";

export async function complete({ workItem }: { workItem: WorkItem }): Promise<void> {
  const { runSyncedWrite } = getWorkItemsContext();
  const completedAt = nowIso();
  runSyncedWrite({
    write: ({ db, syncVersion }) => {
      db.update(workItems)
        .set({
          status: "done",
          completedAt,
          leaseExpiresAt: null,
          syncVersion,
          updatedAt: completedAt,
        })
        .where(eq(workItems.id, workItem.id))
        .run();
    },
  });
}
