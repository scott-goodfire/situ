import { and, asc, eq, lte, ne, sql } from "drizzle-orm";
import { DateTime } from "luxon";

import { getDb } from "../../data/db/client";
import { workItems, type WorkItem } from "../../data/db/schema";
import { runSyncedWrite } from "../../data/db/sync";
import { dateTimeModule } from "../../modules/date-time";

export async function claimDueWorkItem({
  leaseMs,
  purpose,
  excludePurpose,
}: {
  leaseMs: number;
  purpose?: string;
  excludePurpose?: string;
}): Promise<WorkItem | undefined> {
  const db = getDb();
  const now = dateTimeModule.nowIso();
  const candidate = await db.query.workItems.findFirst({
    where: and(
      eq(workItems.status, "pending"),
      lte(workItems.availableAt, now),
      purpose ? eq(workItems.purpose, purpose) : undefined,
      excludePurpose ? ne(workItems.purpose, excludePurpose) : undefined,
    ),
    orderBy: [asc(workItems.availableAt), asc(workItems.createdAt), asc(workItems.id)],
  });
  if (!candidate) {
    return undefined;
  }

  const claimedAt = dateTimeModule.nowIso();
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
      return tx.query.workItems
        .findFirst({
          where: and(
            eq(workItems.id, candidate.id),
            eq(workItems.status, "claimed"),
            eq(workItems.ownerWorkflowId, claimToken),
          ),
        })
        .sync();
    },
  });
  return claimed;
}

export async function countClaimedWorkItems({ purpose }: { purpose: string }): Promise<number> {
  const rows = await getDb()
    .select({ id: workItems.id })
    .from(workItems)
    .where(and(eq(workItems.status, "claimed"), eq(workItems.purpose, purpose)));
  return rows.length;
}
