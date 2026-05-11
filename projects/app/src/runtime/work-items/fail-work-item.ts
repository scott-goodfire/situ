import { eq } from "drizzle-orm";
import { DateTime } from "luxon";

import { recordAppEvent } from "../../app-events";
import { workItems, type WorkItem } from "../../data/db/schema";
import { runSyncedWrite } from "../../data/db/sync";
import { dateTimeModule } from "../../modules/date-time";
import { workItemPayload } from "./payload";

export async function failOrRetryWorkItem({
  workItem,
  error,
  maxAttempts,
}: {
  workItem: WorkItem;
  error: unknown;
  maxAttempts: number;
}): Promise<"retry" | "failed"> {
  const message = error instanceof Error ? error.message : String(error);
  if (workItem.attempt < maxAttempts) {
    await retryWorkItem({ workItem, message });
    return "retry";
  }

  const now = dateTimeModule.nowIso();
  runSyncedWrite({
    write: ({ db, syncVersion }) => {
      db.update(workItems)
        .set({
          status: "failed",
          completedAt: now,
          leaseExpiresAt: null,
          payloadJson: JSON.stringify({
            ...workItemPayload({ workItem }),
            lastError: message,
          }),
          syncVersion,
          updatedAt: now,
        })
        .where(eq(workItems.id, workItem.id))
        .run();
    },
  });
  await recordAppEvent({
    type: "work_item.failed",
    message: `Work item failed: ${workItem.purpose}`,
    payload: { workItemId: workItem.id, error: message },
  });
  return "failed";
}

async function retryWorkItem({
  workItem,
  message,
}: {
  workItem: WorkItem;
  message: string;
}): Promise<void> {
  const now = dateTimeModule.nowIso();
  const availableAt = DateTime.utc()
    .plus({ seconds: Math.min(60, 2 ** Math.max(0, workItem.attempt)) })
    .toISO();
  runSyncedWrite({
    write: ({ db, syncVersion }) => {
      db.update(workItems)
        .set({
          status: "pending",
          availableAt,
          claimedAt: null,
          leaseExpiresAt: null,
          ownerWorkflowId: null,
          payloadJson: JSON.stringify({
            ...workItemPayload({ workItem }),
            lastError: message,
          }),
          syncVersion,
          updatedAt: now,
        })
        .where(eq(workItems.id, workItem.id))
        .run();
    },
  });
  await recordAppEvent({
    type: "work_item.retry_scheduled",
    message: `Work item scheduled for retry: ${workItem.purpose}`,
    payload: { workItemId: workItem.id, availableAt, error: message },
  });
}
