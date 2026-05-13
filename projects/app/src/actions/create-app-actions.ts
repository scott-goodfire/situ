import { createId as createPrefixedId, nowIso, SYSTEM_ACTOR } from "@situ/common";
import type { CommentRecord } from "@situ/comments";
import type { NotificationRecord } from "@situ/notifications";
import type { ProjectRecord } from "@situ/projects";
import type { TaskRecord } from "@situ/tasks";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import { addComment } from "./comments";
import {
  dismissNotification,
  markNotificationRead,
  markNotificationUnread,
  snoozeNotification,
} from "./notifications";
import { createProjectAction } from "./projects";
import { createAppRepositories, type AppRepositories } from "./repositories";
import { assignTaskAction, createTaskAction, updateTaskStatusAction } from "./tasks";
import type {
  AssignTaskInput,
  CreateAppActionsInput,
  CreateCommentInput,
  CreateProjectInput,
  CreateTaskInput,
  IdFactory,
  NotificationInput,
  SnoozeNotificationInput,
  UpdateTaskStatusInput,
} from "./types";

const defaultIdFactory: IdFactory = (prefix) => createPrefixedId(prefix);

export type AppActions = {
  assignTask(input: AssignTaskInput): TaskRecord;
  claimTask(input: Omit<AssignTaskInput, "assignee">): TaskRecord;
  createComment(input: CreateCommentInput): CommentRecord;
  createProject(input: CreateProjectInput): ProjectRecord;
  createTask(input: CreateTaskInput): TaskRecord;
  dismissNotification(input: NotificationInput): NotificationRecord;
  markNotificationRead(input: NotificationInput): NotificationRecord;
  markNotificationUnread(input: NotificationInput): NotificationRecord;
  snoozeNotification(input: SnoozeNotificationInput): NotificationRecord;
  updateTaskStatus(input: UpdateTaskStatusInput): TaskRecord;
};

/** Creates the app action surface over one app database. */
export const createAppActions = ({
  createId = defaultIdFactory,
  db,
  now = nowIso,
}: CreateAppActionsInput): AppActions => {
  const runWrite = <T>({ write }: { write: (repositories: AppRepositories) => T }): T =>
    db.transaction((transaction) =>
      write(
        createAppRepositories({
          db: transaction as unknown as BunSQLiteDatabase<Record<string, unknown>>,
        }),
      ),
    );

  return {
    assignTask(input) {
      return runWrite({
        write: (repositories) =>
          assignTaskAction({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    claimTask(input) {
      const actor = input.actor ?? SYSTEM_ACTOR;

      return runWrite({
        write: (repositories) =>
          assignTaskAction({
            createId,
            input: {
              ...input,
              actor,
              assignee: actor,
            },
            now,
            repositories,
          }),
      });
    },

    createComment(input) {
      return runWrite({
        write: (repositories) =>
          addComment({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    createProject(input) {
      return runWrite({
        write: (repositories) =>
          createProjectAction({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    createTask(input) {
      return runWrite({
        write: (repositories) =>
          createTaskAction({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    dismissNotification(input) {
      return runWrite({
        write: (repositories) =>
          dismissNotification({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    markNotificationRead(input) {
      return runWrite({
        write: (repositories) =>
          markNotificationRead({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    markNotificationUnread(input) {
      return runWrite({
        write: (repositories) =>
          markNotificationUnread({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    snoozeNotification(input) {
      return runWrite({
        write: (repositories) =>
          snoozeNotification({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    updateTaskStatus(input) {
      return runWrite({
        write: (repositories) =>
          updateTaskStatusAction({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },
  };
};
