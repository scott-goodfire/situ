import { isIsoAtOrBefore, nowIso } from "@situ/common";
import type { ActorRef, IsoTimestamp, TargetRef } from "@situ/common";

export const NOTIFICATION_TYPES = [
  "task_assigned",
  "review_requested",
  "changes_requested",
  "comment_mentioned",
  "project_steering_updated",
  "stale_work_requeued",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationRecord = {
  id: string;
  recipient: ActorRef;
  type: NotificationType;
  target: TargetRef;
  title: string;
  bodyMarkdown?: string;
  readAt?: IsoTimestamp;
  dismissedAt?: IsoTimestamp;
  snoozedUntil?: IsoTimestamp;
  deliveryAttemptedAt?: IsoTimestamp;
  createdAt: IsoTimestamp;
};

export type WakeableNotificationState = Pick<
  NotificationRecord,
  "dismissedAt" | "readAt" | "snoozedUntil"
>;

export type IsWakeableNotificationInput = {
  notification: WakeableNotificationState;
  now?: IsoTimestamp;
};

/**
 * Returns whether a notification can wake its recipient.
 */
export const isWakeableNotification = ({
  notification,
  now = nowIso(),
}: IsWakeableNotificationInput): boolean => {
  if (notification.readAt !== undefined || notification.dismissedAt !== undefined) {
    return false;
  }

  if (notification.snoozedUntil === undefined) {
    return true;
  }

  return isIsoAtOrBefore({
    left: notification.snoozedUntil,
    right: now,
  });
};
