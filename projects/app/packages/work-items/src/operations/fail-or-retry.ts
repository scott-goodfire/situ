import { eq } from "drizzle-orm";
import { DateTime } from "luxon";

import { getWorkItemsContext } from "../context";
import { workItems } from "../schema";
import { nowIso } from "../__shared__";
import type { WorkItem } from "../types";
import { workItemPayload } from "./payload";

export async function failOrRetry({
  workItem,
  error,
  maxAttempts,
}: {
  workItem: WorkItem;
  error: unknown;
  maxAttempts: number;
}): Promise<"retry" | "failed"> {
  const { runSyncedWrite, recordAppEvent } = getWorkItemsContext();
  const message = error instanceof Error ? error.message : String(error);
  if (workItem.attempt < maxAttempts) {
    await retry({ workItem, message, runSyncedWrite, recordAppEvent });
    return "retry";
  }

  const now = nowIso();
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

async function retry({
  workItem,
  message,
  runSyncedWrite,
  recordAppEvent,
}: {
  workItem: WorkItem;
  message: string;
  runSyncedWrite: ReturnType<typeof getWorkItemsContext>["runSyncedWrite"];
  recordAppEvent: ReturnType<typeof getWorkItemsContext>["recordAppEvent"];
}): Promise<void> {
  const now = nowIso();
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
