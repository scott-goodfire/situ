import type { ActorKind, TargetKind } from "@situ/common";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const EVENTS_TABLE = "events";

export const events = sqliteTable(EVENTS_TABLE, {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  actorKind: text("actor_kind").$type<ActorKind>().notNull(),
  actorId: text("actor_id").notNull(),
  targetKind: text("target_kind").$type<TargetKind>().notNull(),
  targetId: text("target_id").notNull(),
  message: text("message").notNull(),
  payloadJson: text("payload_json").notNull(),
  createdAt: text("created_at").notNull(),
});

export type EventRow = typeof events.$inferSelect;
export type NewEventRow = typeof events.$inferInsert;
