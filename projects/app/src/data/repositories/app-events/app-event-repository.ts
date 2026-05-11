import { and, desc, eq, gte } from "drizzle-orm";

import { getDb } from "../../db/client";
import { appEvents } from "../../db/schema";
import { clampRepositoryLimit, matchesRepositorySearch, PreconditionError } from "../__shared__";

export type AppEventRecord = typeof appEvents.$inferSelect;

export const appEventRepository = {
  async get({ appEventId }: { appEventId: number }): Promise<AppEventRecord | undefined> {
    return getDb().query.appEvents.findFirst({
      where: eq(appEvents.id, appEventId),
    });
  },

  async require({ appEventId }: { appEventId: number }): Promise<AppEventRecord> {
    const event = await appEventRepository.get({ appEventId });
    if (!event) {
      throw new PreconditionError({
        code: "app_event_not_found",
        hint: "List or search AppEvents; this id may be stale or out of range.",
        details: { appEventId },
      });
    }
    return event;
  },

  async list({ limit = 20 }: { limit?: number } = {}): Promise<AppEventRecord[]> {
    const rows = await getDb()
      .select()
      .from(appEvents)
      .orderBy(desc(appEvents.createdAt), desc(appEvents.id));
    return rows.slice(0, clampRepositoryLimit({ limit }));
  },

  async search({
    query,
    type,
    since,
    limit = 20,
  }: {
    query?: string;
    type?: string;
    since?: string;
    limit?: number;
  } = {}): Promise<AppEventRecord[]> {
    const conditions = [];
    if (type) {
      conditions.push(eq(appEvents.type, type));
    }
    if (since) {
      conditions.push(gte(appEvents.createdAt, since));
    }
    const baseQuery = getDb().select().from(appEvents);
    const filteredQuery =
      conditions.length === 0
        ? baseQuery
        : baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    const rows = await filteredQuery.orderBy(desc(appEvents.createdAt), desc(appEvents.id));
    const filtered = rows.filter((event) =>
      matchesRepositorySearch({
        query,
        values: [event.type, event.message],
      }),
    );
    return filtered.slice(0, clampRepositoryLimit({ limit }));
  },
};
