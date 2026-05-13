import { advanceSyncMetadata, createSyncMetadata } from "@situ/common";
import type { NotificationRecord } from "@situ/notifications";
import type { TaskRecord } from "@situ/tasks";

import { ensureActorExists, resolveActionActor } from "./actors";
import { recordEvent } from "./events";
import type { AppRepositories } from "./repositories";
import { ensureTargetExists, targetForNotification, targetForTask } from "./targets";
import type { Clock, IdFactory, NotificationInput, SnoozeNotificationInput } from "./types";
import type { RecordNotificationDeliveryAttemptInput } from "./types";

export type CreateNotificationInput = {
  createId: IdFactory;
  notification: Omit<
    NotificationRecord,
    "createdAt" | "id" | "syncDeleted" | "syncVersion" | "updatedAt"
  >;
  now: Clock;
  repositories: AppRepositories;
};

export type CreateTaskAssignedNotificationInput = {
  createId: IdFactory;
  now: Clock;
  repositories: AppRepositories;
  task: TaskRecord;
};

/**
 * Creates or reuses an open notification.
 */
export const createNotification = ({
  createId,
  notification,
  now,
  repositories,
}: CreateNotificationInput): NotificationRecord => {
  const timestamp = now();

  ensureActorExists({
    actor: notification.recipient,
    repositories,
  });

  ensureTargetExists({
    repositories,
    target: notification.target,
  });

  const candidate: NotificationRecord = {
    ...notification,
    id: createId("notification"),
    ...createSyncMetadata(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const existing = repositories.notifications.findOpenEquivalent({
    notification: candidate,
  });

  if (existing !== undefined) {
    return existing;
  }

  return repositories.notifications.create({
    notification: candidate,
  });
};

/**
 * Creates a task-assigned notification.
 */
export const createTaskAssignedNotification = ({
  createId,
  now,
  repositories,
  task,
}: CreateTaskAssignedNotificationInput): NotificationRecord | undefined => {
  const assignee = task.assignee;

  if (assignee === undefined) {
    return undefined;
  }

  if (assignee.actorKind !== "agent") {
    return undefined;
  }

  return createNotification({
    createId,
    notification: {
      bodyMarkdown: task.bodyMarkdown,
      recipient: assignee,
      target: targetForTask({ task }),
      title: `Task assigned: ${task.title}`,
      type: "task_assigned",
    },
    now,
    repositories,
  });
};

/**
 * Marks a notification as read.
 */
export const markNotificationRead = ({
  createId,
  input,
  now,
  repositories,
}: {
  createId: IdFactory;
  input: NotificationInput;
  now: Clock;
  repositories: AppRepositories;
}): NotificationRecord => {
  const actor = resolveActionActor({
    actor: input.actor,
    repositories,
  });
  const timestamp = now();
  const notification = repositories.notifications.require({
    id: input.notificationId,
  });
  const updated = repositories.notifications.update({
    notification: {
      ...notification,
      readAt: timestamp,
      ...advanceSyncMetadata({ record: notification }),
      updatedAt: timestamp,
    },
  });

  recordEvent({
    createId,
    event: {
      actor,
      message: "Notification marked read",
      payload: {},
      target: targetForNotification({ notification: updated }),
      type: "notification.read",
    },
    now,
    repositories,
  });

  return updated;
};

/**
 * Marks a notification as unread.
 */
export const markNotificationUnread = ({
  createId,
  input,
  now,
  repositories,
}: {
  createId: IdFactory;
  input: NotificationInput;
  now: Clock;
  repositories: AppRepositories;
}): NotificationRecord => {
  const actor = resolveActionActor({
    actor: input.actor,
    repositories,
  });
  const timestamp = now();
  const notification = repositories.notifications.require({
    id: input.notificationId,
  });
  const updated = repositories.notifications.update({
    notification: {
      ...notification,
      readAt: undefined,
      ...advanceSyncMetadata({ record: notification }),
      updatedAt: timestamp,
    },
  });

  recordEvent({
    createId,
    event: {
      actor,
      message: "Notification marked unread",
      payload: {},
      target: targetForNotification({ notification: updated }),
      type: "notification.unread",
    },
    now,
    repositories,
  });

  return updated;
};

/**
 * Dismisses a notification.
 */
export const dismissNotification = ({
  createId,
  input,
  now,
  repositories,
}: {
  createId: IdFactory;
  input: NotificationInput;
  now: Clock;
  repositories: AppRepositories;
}): NotificationRecord => {
  const actor = resolveActionActor({
    actor: input.actor,
    repositories,
  });
  const timestamp = now();
  const notification = repositories.notifications.require({
    id: input.notificationId,
  });
  const updated = repositories.notifications.update({
    notification: {
      ...notification,
      dismissedAt: timestamp,
      ...advanceSyncMetadata({ record: notification }),
      updatedAt: timestamp,
    },
  });

  recordEvent({
    createId,
    event: {
      actor,
      message: "Notification dismissed",
      payload: {},
      target: targetForNotification({ notification: updated }),
      type: "notification.dismissed",
    },
    now,
    repositories,
  });

  return updated;
};

/**
 * Records a notification delivery attempt.
 */
export const recordNotificationDeliveryAttempt = ({
  createId,
  input,
  now,
  repositories,
}: {
  createId: IdFactory;
  input: RecordNotificationDeliveryAttemptInput;
  now: Clock;
  repositories: AppRepositories;
}): NotificationRecord => {
  const actor = resolveActionActor({
    actor: input.actor,
    repositories,
  });
  const timestamp = now();
  const notification = repositories.notifications.require({
    id: input.notificationId,
  });
  const updated = repositories.notifications.update({
    notification: {
      ...notification,
      deliveryAttemptedAt: timestamp,
      ...advanceSyncMetadata({ record: notification }),
      updatedAt: timestamp,
    },
  });

  recordEvent({
    createId,
    event: {
      actor,
      message: "Notification delivery attempted",
      payload: {},
      target: targetForNotification({ notification: updated }),
      type: "notification.delivery_attempted",
    },
    now,
    repositories,
  });

  return updated;
};

/**
 * Snoozes a notification.
 */
export const snoozeNotification = ({
  createId,
  input,
  now,
  repositories,
}: {
  createId: IdFactory;
  input: SnoozeNotificationInput;
  now: Clock;
  repositories: AppRepositories;
}): NotificationRecord => {
  const actor = resolveActionActor({
    actor: input.actor,
    repositories,
  });
  const timestamp = now();
  const notification = repositories.notifications.require({
    id: input.notificationId,
  });
  const updated = repositories.notifications.update({
    notification: {
      ...notification,
      snoozedUntil: input.snoozedUntil,
      ...advanceSyncMetadata({ record: notification }),
      updatedAt: timestamp,
    },
  });

  recordEvent({
    createId,
    event: {
      actor,
      message: "Notification snoozed",
      payload: {
        snoozedUntil: input.snoozedUntil,
      },
      target: targetForNotification({ notification: updated }),
      type: "notification.snoozed",
    },
    now,
    repositories,
  });

  return updated;
};
