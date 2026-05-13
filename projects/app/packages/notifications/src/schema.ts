import type { ActorKind, TargetKind } from "@situ/common";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { NotificationType } from "./types";

export const NOTIFICATIONS_TABLE = "notifications";

export const notifications = sqliteTable(NOTIFICATIONS_TABLE, {
  id: text("id").primaryKey(),
  recipientActorKind: text("recipient_actor_kind").$type<ActorKind>().notNull(),
  recipientActorId: text("recipient_actor_id").notNull(),
  type: text("type").$type<NotificationType>().notNull(),
  targetKind: text("target_kind").$type<TargetKind>().notNull(),
  targetId: text("target_id").notNull(),
  title: text("title").notNull(),
  bodyMarkdown: text("body_markdown"),
  readAt: text("read_at"),
  dismissedAt: text("dismissed_at"),
  snoozedUntil: text("snoozed_until"),
  deliveryAttemptedAt: text("delivery_attempted_at"),
  createdAt: text("created_at").notNull(),
});

export type NotificationRow = typeof notifications.$inferSelect;
export type NewNotificationRow = typeof notifications.$inferInsert;
