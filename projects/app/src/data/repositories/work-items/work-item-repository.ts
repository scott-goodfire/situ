import { and, desc, eq, gte, inArray } from "drizzle-orm";

import { getDb } from "../../db/client";
import { workItems } from "../../db/schema";
import { clampRepositoryLimit } from "../__shared__";

export type WorkItemRecord = typeof workItems.$inferSelect;
export type WorkItemStatus = WorkItemRecord["status"];

export const workItemRepository = {
  async list({
    status,
    purposePrefix,
    since,
    limit,
  }: {
    status?: WorkItemStatus | readonly WorkItemStatus[];
    purposePrefix?: string;
    since?: string;
    limit?: number;
  }): Promise<WorkItemRecord[]> {
    const filters = [] as ReturnType<typeof eq>[];
    if (Array.isArray(status)) {
      filters.push(inArray(workItems.status, status));
    } else if (typeof status === "string") {
      filters.push(eq(workItems.status, status));
    }
    if (since) {
      filters.push(gte(workItems.updatedAt, since));
    }
    const rows = await getDb().query.workItems.findMany({
      where: filters.length > 0 ? and(...filters) : undefined,
      orderBy: [desc(workItems.updatedAt)],
    });
    const filtered = purposePrefix
      ? rows.filter((row) => row.purpose.startsWith(purposePrefix))
      : rows;
    return filtered.slice(0, clampRepositoryLimit({ limit }));
  },
};
