import { notifications } from "./schema";

export const NOTIFICATIONS_SYNC_PREFIX = "notifications";

export const notificationsSyncSerializer = {
  prefix: NOTIFICATIONS_SYNC_PREFIX,
  table: notifications,
  serialize: ({ row }: { row: Record<string, unknown> }) => row,
};
