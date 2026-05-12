import { and, eq, lt } from "drizzle-orm";

import { getWorkItemsContext } from "../context";
import { workItems } from "../schema";
import { nowIso } from "../__shared__";
import type { WorkItem } from "../types";
import { failOrRetry } from "./fail-or-retry";

/**
 * Sweep expired claimed work items and retry-or-fail each. Returns the
 * `WorkItem[]` that crossed `maxAttempts` and ended up failed — the caller
 * decides what side-effects to run for each (e.g., releasing compute).
 *
 * Returning the failed items rather than hard-coding a compute release
 * call keeps the package free of cross-domain orchestration.
 */
export async function recoverExpiredLeases({
  maxAttempts,
  limit,
}: {
  maxAttempts: number;
  limit: number;
}): Promise<WorkItem[]> {
  const db = getWorkItemsContext().getDb();
  const stale = await db
    .select()
    .from(workItems)
    .where(and(eq(workItems.status, "claimed"), lt(workItems.leaseExpiresAt, nowIso())))
    .limit(limit);
  const failed: WorkItem[] = [];
  for (const workItem of stale) {
    const outcome = await failOrRetry({
      workItem,
      maxAttempts,
      error: new Error("Work item lease expired."),
    });
    if (outcome === "failed") {
      failed.push(workItem);
    }
  }
  return failed;
}
