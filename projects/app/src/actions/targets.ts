import type { TargetRef } from "@situ/common";
import { InvalidArgumentError } from "@situ/errors";
import type { NotificationRecord } from "@situ/notifications";
import type { ProjectRecord } from "@situ/projects";
import type { TaskRecord } from "@situ/tasks";

import type { AppRepositories } from "./repositories";

export type EnsureTargetExistsInput = {
  repositories: AppRepositories;
  target: TargetRef;
};

export type UpdateTargetActivityInput = {
  repositories: AppRepositories;
  target: TargetRef;
  timestamp: string;
};

/** Returns the generic target reference for a project. */
export const targetForProject = ({ project }: { project: ProjectRecord }): TargetRef => ({
  targetKind: "project",
  targetId: project.id,
});

/** Returns the generic target reference for a task. */
export const targetForTask = ({ task }: { task: TaskRecord }): TargetRef => ({
  targetKind: "task",
  targetId: task.id,
});

/** Returns the generic target reference for a notification. */
export const targetForNotification = ({
  notification,
}: {
  notification: NotificationRecord;
}): TargetRef => ({
  targetKind: "notification",
  targetId: notification.id,
});

/** Validates that a target currently exists for app-action writes. */
export const ensureTargetExists = ({ repositories, target }: EnsureTargetExistsInput): void => {
  if (target.targetKind === "project") {
    repositories.projects.require({ id: target.targetId });
    return;
  }

  if (target.targetKind === "task") {
    repositories.tasks.require({ id: target.targetId });
    return;
  }

  if (target.targetKind === "notification") {
    repositories.notifications.require({ id: target.targetId });
    return;
  }

  throw new InvalidArgumentError({
    details: {
      target,
    },
    message: `Unsupported action target: ${target.targetKind}`,
  });
};

/** Updates task activity when a target points at a task. */
export const updateTargetActivity = ({
  repositories,
  target,
  timestamp,
}: UpdateTargetActivityInput): void => {
  if (target.targetKind !== "task") {
    return;
  }

  const task = repositories.tasks.require({ id: target.targetId });

  repositories.tasks.update({
    task: {
      ...task,
      lastActivityAt: timestamp,
      updatedAt: timestamp,
    },
  });
};
