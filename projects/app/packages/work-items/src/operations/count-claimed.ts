import { and, eq } from "drizzle-orm";

import { getWorkItemsContext } from "../context";
import { workItems } from "../schema";

export async function countClaimed({ purpose }: { purpose: string }): Promise<number> {
  const db = getWorkItemsContext().getDb();
  const rows = await db
    .select({ id: workItems.id })
    .from(workItems)
    .where(and(eq(workItems.status, "claimed"), eq(workItems.purpose, purpose)));
  return rows.length;
}
