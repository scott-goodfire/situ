import { NOTIFICATIONS_SYNC_PREFIX } from "./sync";

export const notificationsModule = {
  name: "@situ/notifications",
  syncPrefix: NOTIFICATIONS_SYNC_PREFIX,
} as const;
