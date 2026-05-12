import type { BaseRepository } from "@situ/common";
import { and, desc, eq, gte, inArray, type SQL } from "drizzle-orm";

import { getWorkItemsContext } from "../context";
import { workItems } from "../schema";
import { clampRepositoryLimit } from "../__shared__";
import type { WorkItemRecord, WorkItemStatus } from "../types";

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
    const filters: SQL[] = [];
    if (Array.isArray(status)) {
      filters.push(inArray(workItems.status, status));
    } else if (typeof status === "string") {
      filters.push(eq(workItems.status, status));
    }
    if (since) {
      filters.push(gte(workItems.updatedAt, since));
    }
    const db = getWorkItemsContext().getDb();
    const rows = await db
      .select()
      .from(workItems)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(workItems.updatedAt));
    const filtered = purposePrefix
      ? rows.filter((row) => row.purpose.startsWith(purposePrefix))
      : rows;
    return filtered.slice(0, clampRepositoryLimit({ limit }));
  },
} satisfies BaseRepository<WorkItemRecord>;
