import { and, asc, eq, lte, ne, sql, type SQL } from "drizzle-orm";
import { DateTime } from "luxon";

import { getWorkItemsContext } from "../context";
import { workItems } from "../schema";
import { nowIso } from "../__shared__";
import type { WorkItem } from "../types";

export async function claimDue({
  leaseMs,
  purpose,
  excludePurpose,
}: {
  leaseMs: number;
  purpose?: string;
  excludePurpose?: string;
}): Promise<WorkItem | undefined> {
  const { getDb, runSyncedWrite } = getWorkItemsContext();
  const db = getDb();
  const now = nowIso();
  const filters: SQL[] = [eq(workItems.status, "pending"), lte(workItems.availableAt, now)];
  if (purpose) {
    filters.push(eq(workItems.purpose, purpose));
  }
  if (excludePurpose) {
    filters.push(ne(workItems.purpose, excludePurpose));
  }
  const [candidate] = await db
    .select()
    .from(workItems)
    .where(and(...filters))
    .orderBy(asc(workItems.availableAt), asc(workItems.createdAt), asc(workItems.id))
    .limit(1);
  if (!candidate) {
    return undefined;
  }

  const claimedAt = nowIso();
  const leaseExpiresAt = DateTime.utc().plus({ milliseconds: leaseMs }).toISO();
  const claimToken = `scheduler:${crypto.randomUUID()}`;
  const { result: claimed } = runSyncedWrite({
    write: ({ db: tx, syncVersion }) => {
      tx.update(workItems)
        .set({
          status: "claimed",
          ownerWorkflowId: claimToken,
          attempt: sql`${workItems.attempt} + 1`,
          claimedAt,
          leaseExpiresAt,
          syncVersion,
          updatedAt: claimedAt,
        })
        .where(and(eq(workItems.id, candidate.id), eq(workItems.status, "pending")))
        .run();
      const [row] = tx
        .select()
        .from(workItems)
        .where(
          and(
            eq(workItems.id, candidate.id),
            eq(workItems.status, "claimed"),
            eq(workItems.ownerWorkflowId, claimToken),
          ),
        )
        .limit(1)
        .all();
      return row;
    },
  });
  return claimed;
}
