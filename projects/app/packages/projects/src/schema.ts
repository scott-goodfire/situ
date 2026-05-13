import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { ProjectStatus } from "./types";

export const PROJECTS_TABLE = "projects";

export const projects = sqliteTable(PROJECTS_TABLE, {
  id: text("id").primaryKey(),
  syncVersion: integer("sync_version").notNull(),
  syncDeleted: integer("sync_deleted", { mode: "boolean" }).notNull(),
  goalMarkdown: text("goal_markdown").notNull(),
  status: text("status").$type<ProjectStatus>().notNull(),
  currentBaselineSummary: text("current_baseline_summary").notNull(),
  currentAnswerSummary: text("current_answer_summary").notNull(),
  confidenceSummary: text("confidence_summary").notNull(),
  blockersSummary: text("blockers_summary").notNull(),
  openQuestionsSummary: text("open_questions_summary").notNull(),
  progressCheckpointsSummary: text("progress_checkpoints_summary").notNull(),
  finalResultSummary: text("final_result_summary").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type ProjectRow = typeof projects.$inferSelect;
export type NewProjectRow = typeof projects.$inferInsert;
