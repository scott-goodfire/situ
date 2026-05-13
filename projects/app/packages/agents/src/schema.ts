import { sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { AgentStatus } from "./types";

export const AGENTS_TABLE = "agents";

export const agents = sqliteTable(AGENTS_TABLE, {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  instructionsMarkdown: text("instructions_markdown").notNull(),
  status: text("status").$type<AgentStatus>().notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type AgentRow = typeof agents.$inferSelect;
export type NewAgentRow = typeof agents.$inferInsert;
