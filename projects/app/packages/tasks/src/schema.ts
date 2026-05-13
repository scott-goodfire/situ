import type { ActorKind, TargetKind } from "@situ/common";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { TaskStatus, TaskType } from "./types";

export const TASKS_TABLE = "tasks";

export const tasks = sqliteTable(TASKS_TABLE, {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  title: text("title").notNull(),
  bodyMarkdown: text("body_markdown").notNull(),
  status: text("status").$type<TaskStatus>().notNull(),
  type: text("type").$type<TaskType>().notNull(),
  priority: integer("priority").notNull(),
  creatorActorKind: text("creator_actor_kind").$type<ActorKind>().notNull(),
  creatorActorId: text("creator_actor_id").notNull(),
  assigneeActorKind: text("assignee_actor_kind").$type<ActorKind>(),
  assigneeActorId: text("assignee_actor_id"),
  activeAgentSessionId: text("active_agent_session_id"),
  parentTaskId: text("parent_task_id"),
  targetKind: text("target_kind").$type<TargetKind>(),
  targetId: text("target_id"),
  labelIdsJson: text("label_ids_json").notNull(),
  lastActivityAt: text("last_activity_at").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;
