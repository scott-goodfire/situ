import { eq } from "drizzle-orm";

import { workItems, type WorkItem } from "../../data/db/schema";
import { runSyncedWrite } from "../../data/db/sync";
import { dateTimeModule } from "../../modules/date-time";

export async function completeWorkItem({ workItem }: { workItem: WorkItem }): Promise<void> {
  const completedAt = dateTimeModule.nowIso();
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
