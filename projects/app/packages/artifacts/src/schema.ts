import type { ActorKind, TargetKind } from "@situ/common";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { ArtifactType } from "./types";

export const ARTIFACTS_TABLE = "artifacts";

export const artifacts = sqliteTable(ARTIFACTS_TABLE, {
  id: text("id").primaryKey(),
  syncVersion: integer("sync_version").notNull(),
  syncDeleted: integer("sync_deleted", { mode: "boolean" }).notNull(),
  projectId: text("project_id").notNull(),
  targetKind: text("target_kind").$type<TargetKind>().notNull(),
  targetId: text("target_id").notNull(),
  type: text("type").$type<ArtifactType>().notNull(),
  title: text("title").notNull(),
  uri: text("uri").notNull(),
  mediaType: text("media_type"),
  summaryMarkdown: text("summary_markdown").notNull(),
  taskId: text("task_id"),
  experimentId: text("experiment_id"),
  sourceCommit: text("source_commit"),
  createdByActorKind: text("created_by_actor_kind").$type<ActorKind>().notNull(),
  createdByActorId: text("created_by_actor_id").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type ArtifactRow = typeof artifacts.$inferSelect;
export type NewArtifactRow = typeof artifacts.$inferInsert;
