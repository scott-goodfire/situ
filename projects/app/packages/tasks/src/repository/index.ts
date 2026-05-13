import { NotFoundError } from "@situ/errors";
import { eq } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import {
  labels,
  tasks,
  type LabelRow,
  type NewLabelRow,
  type NewTaskRow,
  type TaskRow,
} from "../schema";
import type { LabelRecord, TaskRecord } from "../types";

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

export type LabelByIdInput = {
  id: string;
};

export type LabelWriteInput = {
  label: LabelRecord;
};

export type TaskRepository = {
  create(input: TaskWriteInput): TaskRecord;
  createLabel(input: LabelWriteInput): LabelRecord;
  get(input: TaskByIdInput): TaskRecord | undefined;
  getLabel(input: LabelByIdInput): LabelRecord | undefined;
  listLabels(): LabelRecord[];
  require(input: TaskByIdInput): TaskRecord;
  requireLabel(input: LabelByIdInput): LabelRecord;
  listByProject(input: TaskByProjectInput): TaskRecord[];
  updateLabel(input: LabelWriteInput): LabelRecord;
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

const encodeLabel = ({ label }: LabelWriteInput): NewLabelRow => ({
  id: label.id,
  name: label.name,
  color: label.color ?? null,
  archivedAt: label.archivedAt ?? null,
  createdAt: label.createdAt,
  updatedAt: label.updatedAt,
});

const decodeLabel = ({ row }: { row: LabelRow }): LabelRecord => ({
  id: row.id,
  name: row.name,
  color: row.color ?? undefined,
  archivedAt: row.archivedAt ?? undefined,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

/**
 * Creates a task repository.
 */
export const createTaskRepository = ({ db }: CreateTaskRepositoryInput): TaskRepository => {
  const repository: TaskRepository = {
    create({ task }) {
      db.insert(tasks).values(encodeTask({ task })).run();
      return task;
    },

    createLabel({ label }) {
      db.insert(labels).values(encodeLabel({ label })).run();
      return label;
    },

    get({ id }) {
      const row = db.select().from(tasks).where(eq(tasks.id, id)).get();

      if (row === undefined) {
        return undefined;
      }

      return decodeTask({ row });
    },

    getLabel({ id }) {
      const row = db.select().from(labels).where(eq(labels.id, id)).get();

      if (row === undefined) {
        return undefined;
      }

      return decodeLabel({ row });
    },

    listLabels() {
      return db
        .select()
        .from(labels)
        .all()
        .map((row) => decodeLabel({ row }));
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

    requireLabel({ id }) {
      const label = repository.getLabel({ id });

      if (label !== undefined) {
        return label;
      }

      throw new NotFoundError({
        details: {
          id,
          resource: "Label",
        },
        message: `Label not found: ${id}`,
      });
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

    updateLabel({ label }) {
      db.update(labels).set(encodeLabel({ label })).where(eq(labels.id, label.id)).run();
      return repository.requireLabel({ id: label.id });
    },
  };

  return repository;
};
