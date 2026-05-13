import { events } from "./schema";

export const EVENTS_SYNC_PREFIX = "events";

export const eventsSyncSerializer = {
  prefix: EVENTS_SYNC_PREFIX,
  table: events,
  serialize: ({ row }: { row: Record<string, unknown> }) => row,
};
