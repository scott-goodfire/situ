import type { ActorKind, TargetKind } from "@situ/common";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const COMMENTS_TABLE = "comments";

export const comments = sqliteTable(COMMENTS_TABLE, {
  id: text("id").primaryKey(),
  syncVersion: integer("sync_version").notNull(),
  syncDeleted: integer("sync_deleted", { mode: "boolean" }).notNull(),
  targetKind: text("target_kind").$type<TargetKind>().notNull(),
  targetId: text("target_id").notNull(),
  authorActorKind: text("author_actor_kind").$type<ActorKind>().notNull(),
  authorActorId: text("author_actor_id").notNull(),
  bodyMarkdown: text("body_markdown").notNull(),
  citedTargetsJson: text("cited_targets_json").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type CommentRow = typeof comments.$inferSelect;
export type NewCommentRow = typeof comments.$inferInsert;
