import { NotFoundError } from "@situ/errors";
import { eq } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import { tasks, type NewTaskRow, type TaskRow } from "../schema";
import type { TaskRecord } from "../types";

export type CreateTaskRepositoryInput = {
  db: BunSQLiteDatabase<Record<string, unknown>>;
};

export type TaskByIdInput = {
  id: string;
};

export type TaskByProjectInput = {
  projectId: string;
};

export type TaskWriteInput = {
  task: TaskRecord;
};

export type TaskRepository = {
  create(input: TaskWriteInput): TaskRecord;
  get(input: TaskByIdInput): TaskRecord | undefined;
  require(input: TaskByIdInput): TaskRecord;
  listByProject(input: TaskByProjectInput): TaskRecord[];
  update(input: TaskWriteInput): TaskRecord;
};

type TaskRowInput = {
  row: TaskRow;
};

type TaskRecordInput = {
  task: TaskRecord;
};

const encodeTask = ({ task }: TaskRecordInput): NewTaskRow => ({
  id: task.id,
  projectId: task.projectId,
  title: task.title,
  bodyMarkdown: task.bodyMarkdown,
  status: task.status,
  type: task.type,
  priority: task.priority,
  creatorActorKind: task.creator.actorKind,
  creatorActorId: task.creator.actorId,
  assigneeActorKind: task.assignee?.actorKind ?? null,
  assigneeActorId: task.assignee?.actorId ?? null,
  activeAgentSessionId: task.activeAgentSessionId ?? null,
  parentTaskId: task.parentTaskId ?? null,
  targetKind: task.target?.targetKind ?? null,
  targetId: task.target?.targetId ?? null,
  labelIdsJson: JSON.stringify(task.labelIds),
  lastActivityAt: task.lastActivityAt,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
});

const decodeAssignee = ({ row }: TaskRowInput): TaskRecord["assignee"] => {
  if (row.assigneeActorKind === null || row.assigneeActorId === null) {
    return undefined;
  }

  return {
    actorKind: row.assigneeActorKind,
    actorId: row.assigneeActorId,
  };
};

const decodeTarget = ({ row }: TaskRowInput): TaskRecord["target"] => {
  if (row.targetKind === null || row.targetId === null) {
    return undefined;
  }

  return {
    targetKind: row.targetKind,
    targetId: row.targetId,
  };
};

const decodeTask = ({ row }: TaskRowInput): TaskRecord => ({
  id: row.id,
  projectId: row.projectId,
  title: row.title,
  bodyMarkdown: row.bodyMarkdown,
  status: row.status,
  type: row.type,
  priority: row.priority,
  creator: {
    actorKind: row.creatorActorKind,
    actorId: row.creatorActorId,
  },
  assignee: decodeAssignee({ row }),
  activeAgentSessionId: row.activeAgentSessionId ?? undefined,
  parentTaskId: row.parentTaskId ?? undefined,
  target: decodeTarget({ row }),
  labelIds: JSON.parse(row.labelIdsJson) as string[],
  lastActivityAt: row.lastActivityAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

/** Creates the repository for task persistence. */
export const createTaskRepository = ({ db }: CreateTaskRepositoryInput): TaskRepository => {
  const repository: TaskRepository = {
    create({ task }) {
      db.insert(tasks).values(encodeTask({ task })).run();
      return task;
    },

    get({ id }) {
      const row = db.select().from(tasks).where(eq(tasks.id, id)).get();

      if (row === undefined) {
        return undefined;
      }

      return decodeTask({ row });
    },

    require({ id }) {
      const task = repository.get({ id });

      if (task === undefined) {
        throw new NotFoundError({
          details: {
            id,
            resource: "Task",
          },
          message: `Task not found: ${id}`,
        });
      }

      return task;
    },

    listByProject({ projectId }) {
      return db
        .select()
        .from(tasks)
        .where(eq(tasks.projectId, projectId))
        .all()
        .map((row) => decodeTask({ row }));
    },

    update({ task }) {
      db.update(tasks).set(encodeTask({ task })).where(eq(tasks.id, task.id)).run();
      return repository.require({ id: task.id });
    },
  };

  return repository;
};
