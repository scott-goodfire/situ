import { advanceSyncMetadata, createSyncMetadata } from "@situ/common";
import type { TaskRecord } from "@situ/tasks";

import { ensureActorExists, resolveActionActor } from "./actors";
import { addComment } from "./comments";
import { recordEvent } from "./events";
import { createTaskAssignedNotification } from "./notifications";
import type { AppRepositories } from "./repositories";
import { ensureTargetExists, targetForTask } from "./targets";
import type {
  AssignTaskInput,
  Clock,
  CreateTaskInput,
  IdFactory,
  UpdateTaskStatusInput,
} from "./types";

export type CreateTaskActionInput = {
  createId: IdFactory;
  input: CreateTaskInput;
  now: Clock;
  repositories: AppRepositories;
};

export type AssignTaskActionInput = {
  createId: IdFactory;
  input: AssignTaskInput;
  now: Clock;
  repositories: AppRepositories;
};

export type UpdateTaskStatusActionInput = {
  createId: IdFactory;
  input: UpdateTaskStatusInput;
  now: Clock;
  repositories: AppRepositories;
};

const recordTaskAssignment = ({
  actor,
  createId,
  now,
  repositories,
  task,
}: {
  actor: NonNullable<AssignTaskInput["actor"]>;
  createId: IdFactory;
  now: Clock;
  repositories: AppRepositories;
  task: TaskRecord;
}): void => {
  if (task.assignee === undefined) {
    return;
  }

  recordEvent({
    createId,
    event: {
      actor,
      message: `Task assigned to ${task.assignee.actorKind}:${task.assignee.actorId}`,
      payload: {
        assignee: task.assignee,
      },
      target: targetForTask({ task }),
      type: "task.assigned",
    },
    now,
    repositories,
  });
};

/**
 * Creates a task.
 */
export const createTaskAction = ({
  createId,
  input,
  now,
  repositories,
}: CreateTaskActionInput): TaskRecord => {
  const actor = resolveActionActor({
    actor: input.actor,
    repositories,
  });
  const timestamp = now();

  repositories.projects.require({
    id: input.projectId,
  });

  if (input.assignee !== undefined) {
    ensureActorExists({
      actor: input.assignee,
      repositories,
    });
  }

  if (input.parentTaskId !== undefined) {
    repositories.tasks.require({
      id: input.parentTaskId,
    });
  }

  if (input.target !== undefined) {
    ensureTargetExists({
      repositories,
      target: input.target,
    });
  }

  const task = repositories.tasks.create({
    task: {
      assignee: input.assignee,
      bodyMarkdown: input.bodyMarkdown,
      createdAt: timestamp,
      creator: actor,
      id: input.id ?? createId("task"),
      labelIds: input.labelIds ?? [],
      lastActivityAt: timestamp,
      parentTaskId: input.parentTaskId,
      priority: input.priority ?? 0,
      projectId: input.projectId,
      ...createSyncMetadata(),
      status: input.status ?? "backlog",
      target: input.target,
      title: input.title,
      type: input.type ?? "coordination",
      updatedAt: timestamp,
    },
  });

  recordEvent({
    createId,
    event: {
      actor,
      message: "Task created",
      payload: {
        projectId: task.projectId,
        taskId: task.id,
      },
      target: targetForTask({ task }),
      type: "task.created",
    },
    now,
    repositories,
  });

  if (task.assignee === undefined) {
    return task;
  }

  createTaskAssignedNotification({
    createId,
    now,
    repositories,
    task,
  });
  recordTaskAssignment({
    actor,
    createId,
    now,
    repositories,
    task,
  });

  return task;
};

/**
 * Assigns a task.
 */
export const assignTaskAction = ({
  createId,
  input,
  now,
  repositories,
}: AssignTaskActionInput): TaskRecord => {
  const actor = resolveActionActor({
    actor: input.actor,
    repositories,
  });
  ensureActorExists({
    actor: input.assignee,
    repositories,
  });
  const task = repositories.tasks.require({
    id: input.taskId,
  });
  const timestamp = now();
  const updated = repositories.tasks.update({
    task: {
      ...task,
      assignee: input.assignee,
      lastActivityAt: timestamp,
      ...advanceSyncMetadata({ record: task }),
      updatedAt: timestamp,
    },
  });

  createTaskAssignedNotification({
    createId,
    now,
    repositories,
    task: updated,
  });
  recordTaskAssignment({
    actor,
    createId,
    now,
    repositories,
    task: updated,
  });

  return updated;
};

/**
 * Updates task status.
 */
export const updateTaskStatusAction = ({
  createId,
  input,
  now,
  repositories,
}: UpdateTaskStatusActionInput): TaskRecord => {
  const actor = resolveActionActor({
    actor: input.actor,
    repositories,
  });
  const task = repositories.tasks.require({
    id: input.taskId,
  });
  const timestamp = now();
  const updated = repositories.tasks.update({
    task: {
      ...task,
      lastActivityAt: timestamp,
      ...advanceSyncMetadata({ record: task }),
      status: input.status,
      updatedAt: timestamp,
    },
  });

  if (input.commentMarkdown !== undefined) {
    addComment({
      createId,
      input: {
        actor,
        bodyMarkdown: input.commentMarkdown,
        target: targetForTask({ task: updated }),
      },
      now,
      repositories,
    });
  }

  recordEvent({
    createId,
    event: {
      actor,
      message: `Task status changed from ${task.status} to ${updated.status}`,
      payload: {
        from: task.status,
        to: updated.status,
      },
      target: targetForTask({ task: updated }),
      type: "task.status_updated",
    },
    now,
    repositories,
  });

  return updated;
};
