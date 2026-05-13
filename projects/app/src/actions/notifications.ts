import { SYSTEM_ACTOR } from "@situ/common";
import type { NotificationRecord } from "@situ/notifications";
import type { TaskRecord } from "@situ/tasks";

import { recordEvent } from "./events";
import type { AppRepositories } from "./repositories";
import { targetForNotification, targetForTask } from "./targets";
import type { Clock, IdFactory, NotificationInput, SnoozeNotificationInput } from "./types";

export type CreateNotificationInput = {
  createId: IdFactory;
  notification: Omit<NotificationRecord, "createdAt" | "id">;
  now: Clock;
  repositories: AppRepositories;
};

export type CreateTaskAssignedNotificationInput = {
  createId: IdFactory;
  now: Clock;
  repositories: AppRepositories;
  task: TaskRecord;
};

/** Creates or reuses an open notification for the same recipient/type/target. */
export const createNotification = ({
  createId,
  notification,
  now,
  repositories,
}: CreateNotificationInput): NotificationRecord => {
  const candidate: NotificationRecord = {
    ...notification,
    id: createId("notification"),
    createdAt: now(),
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

/** Creates a task-assigned notification when the assignee is an agent. */
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

/** Marks a notification as read. */
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
  const actor = input.actor ?? SYSTEM_ACTOR;
  const notification = repositories.notifications.require({
    id: input.notificationId,
  });
  const updated = repositories.notifications.update({
    notification: {
      ...notification,
      readAt: now(),
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

/** Marks a notification as unread. */
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
  const actor = input.actor ?? SYSTEM_ACTOR;
  const notification = repositories.notifications.require({
    id: input.notificationId,
  });
  const updated = repositories.notifications.update({
    notification: {
      ...notification,
      readAt: undefined,
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

/** Dismisses a notification from the recipient inbox. */
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
  const actor = input.actor ?? SYSTEM_ACTOR;
  const notification = repositories.notifications.require({
    id: input.notificationId,
  });
  const updated = repositories.notifications.update({
    notification: {
      ...notification,
      dismissedAt: now(),
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

/** Snoozes a notification until the provided timestamp. */
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
  const actor = input.actor ?? SYSTEM_ACTOR;
  const notification = repositories.notifications.require({
    id: input.notificationId,
  });
  const updated = repositories.notifications.update({
    notification: {
      ...notification,
      snoozedUntil: input.snoozedUntil,
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
