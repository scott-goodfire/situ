import { sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { ExperimentStatus } from "./types";

export const EXPERIMENTS_TABLE = "experiments";

export const experiments = sqliteTable(EXPERIMENTS_TABLE, {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  taskId: text("task_id"),
  parentExperimentId: text("parent_experiment_id"),
  title: text("title").notNull(),
  summaryMarkdown: text("summary_markdown").notNull(),
  worktreePath: text("worktree_path").notNull(),
  baseCommit: text("base_commit").notNull(),
  currentCandidateCommit: text("current_candidate_commit").notNull(),
  status: text("status").$type<ExperimentStatus>().notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type ExperimentRow = typeof experiments.$inferSelect;
export type NewExperimentRow = typeof experiments.$inferInsert;
