import { createCommentRepository } from "@situ/comments";
import { createEventRepository } from "@situ/events";
import { createNotificationRepository } from "@situ/notifications";
import { createProjectRepository } from "@situ/projects";
import { createTaskRepository } from "@situ/tasks";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

export type CreateAppRepositoriesInput = {
  db: BunSQLiteDatabase<Record<string, unknown>>;
};

/** Creates package repositories over one database or transaction handle. */
export const createAppRepositories = ({ db }: CreateAppRepositoriesInput) => ({
  comments: createCommentRepository({ db }),
  events: createEventRepository({ db }),
  notifications: createNotificationRepository({ db }),
  projects: createProjectRepository({ db }),
  tasks: createTaskRepository({ db }),
});

export type AppRepositories = ReturnType<typeof createAppRepositories>;
