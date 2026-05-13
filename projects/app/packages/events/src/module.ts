import { EVENTS_SYNC_PREFIX } from "./sync";

export const eventsModule = {
  name: "@situ/events",
  syncPrefix: EVENTS_SYNC_PREFIX,
} as const;
