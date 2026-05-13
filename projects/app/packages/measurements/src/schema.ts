import type { ActorKind, TargetKind } from "@situ/common";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const MEASUREMENTS_TABLE = "measurements";

export const measurements = sqliteTable(MEASUREMENTS_TABLE, {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  targetKind: text("target_kind").$type<TargetKind>().notNull(),
  targetId: text("target_id").notNull(),
  name: text("name").notNull(),
  valueJson: text("value_json").notNull(),
  unit: text("unit"),
  summaryMarkdown: text("summary_markdown").notNull(),
  observedCommit: text("observed_commit"),
  measuredByActorKind: text("measured_by_actor_kind").$type<ActorKind>().notNull(),
  measuredByActorId: text("measured_by_actor_id").notNull(),
  createdAt: text("created_at").notNull(),
});

export type MeasurementRow = typeof measurements.$inferSelect;
export type NewMeasurementRow = typeof measurements.$inferInsert;
