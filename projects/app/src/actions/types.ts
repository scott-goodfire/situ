import type { ActorRef, IdPrefix, IsoTimestamp, TargetRef } from "@situ/common";
import type { NotificationType } from "@situ/notifications";
import type { ProjectStatus } from "@situ/projects";
import type { TaskStatus, TaskType } from "@situ/tasks";

import type { AppDatabase } from "../db";

export type IdFactory = (prefix: IdPrefix) => string;
export type Clock = () => IsoTimestamp;

export type CreateAppActionsInput = {
  createId?: IdFactory;
  db: AppDatabase;
  now?: Clock;
};

export type CreateProjectInput = {
  actor?: ActorRef;
  goalMarkdown: string;
  id?: string;
  status?: ProjectStatus;
};

export type CreateTaskInput = {
  actor?: ActorRef;
  assignee?: ActorRef;
  bodyMarkdown: string;
  id?: string;
  labelIds?: string[];
  parentTaskId?: string;
  priority?: number;
  projectId: string;
  status?: TaskStatus;
  target?: TargetRef;
  title: string;
  type?: TaskType;
};

export type AssignTaskInput = {
  actor?: ActorRef;
  assignee: ActorRef;
  taskId: string;
};

export type UpdateTaskStatusInput = {
  actor?: ActorRef;
  commentMarkdown?: string;
  status: TaskStatus;
  taskId: string;
};

export type CreateCommentInput = {
  actor?: ActorRef;
  bodyMarkdown: string;
  citedTargets?: TargetRef[];
  id?: string;
  target: TargetRef;
};

export type NotificationInput = {
  actor?: ActorRef;
  notificationId: string;
};

export type SnoozeNotificationInput = NotificationInput & {
  snoozedUntil: IsoTimestamp;
};

export type AppActionNotificationType = NotificationType;
