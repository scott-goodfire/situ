export const NOTIFICATION_MUTATIONS = [
  "notification/mark_read",
  "notification/mark_unread",
  "notification/dismiss",
  "notification/snooze",
] as const;

export type NotificationMutationName = (typeof NOTIFICATION_MUTATIONS)[number];
