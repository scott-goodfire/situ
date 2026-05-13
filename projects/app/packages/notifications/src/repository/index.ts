import type { NotificationRecord } from "../types";

export type NotificationRepository = {
  get(id: string): Promise<NotificationRecord | undefined>;
  listRecentByRecipient(recipientId: string): Promise<NotificationRecord[]>;
  listWakeableByRecipient(recipientId: string): Promise<NotificationRecord[]>;
};
