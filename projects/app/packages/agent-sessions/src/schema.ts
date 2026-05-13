import type { TargetKind } from "@situ/common";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { AgentSessionLogType, AgentSessionStatus } from "./types";

export const AGENT_SESSIONS_TABLE = "agent_sessions";
export const AGENT_SESSION_LOGS_TABLE = "agent_session_logs";

export const agentSessions = sqliteTable(AGENT_SESSIONS_TABLE, {
  id: text("id").primaryKey(),
  syncVersion: integer("sync_version").notNull(),
  syncDeleted: integer("sync_deleted", { mode: "boolean" }).notNull(),
  agentId: text("agent_id").notNull(),
  parentAgentSessionId: text("parent_agent_session_id"),
  remoteClaudeAgentId: text("remote_claude_agent_id"),
  remoteClaudeSessionId: text("remote_claude_session_id"),
  remoteClaudeThreadId: text("remote_claude_thread_id"),
  contextTargetKind: text("context_target_kind").$type<TargetKind>(),
  contextTargetId: text("context_target_id"),
  currentNotificationId: text("current_notification_id"),
  status: text("status").$type<AgentSessionStatus>().notNull(),
  lastActivityAt: text("last_activity_at").notNull(),
  remoteEventCursor: text("remote_event_cursor"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const agentSessionLogs = sqliteTable(AGENT_SESSION_LOGS_TABLE, {
  id: text("id").primaryKey(),
  agentSessionId: text("agent_session_id").notNull(),
  type: text("type").$type<AgentSessionLogType>().notNull(),
  remoteId: text("remote_id"),
  summary: text("summary").notNull(),
  payloadJson: text("payload_json").notNull(),
  createdAt: text("created_at").notNull(),
});

export type AgentSessionRow = typeof agentSessions.$inferSelect;
export type NewAgentSessionRow = typeof agentSessions.$inferInsert;
export type AgentSessionLogRow = typeof agentSessionLogs.$inferSelect;
export type NewAgentSessionLogRow = typeof agentSessionLogs.$inferInsert;
