import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

import { createAgentSessionRepository } from ".";
import type { AgentSessionLogRecord, AgentSessionRecord } from "../types";

const timestamp = "2026-05-12T12:00:00.000Z";

const createAgentSession = (): AgentSessionRecord => ({
  id: "agent_session_1",
  syncVersion: 1,
  syncDeleted: false,
  agentId: "agent_1",
  remoteClaudeAgentId: "claude_agent_1",
  remoteClaudeSessionId: "claude_session_1",
  remoteClaudeThreadId: "claude_thread_1",
  context: {
    targetKind: "task",
    targetId: "task_1",
  },
  currentNotificationId: "notification_1",
  status: "active",
  lastActivityAt: timestamp,
  remoteEventCursor: "cursor_1",
  createdAt: timestamp,
  updatedAt: timestamp,
});

const createLog = (): AgentSessionLogRecord => ({
  id: "agent_session_log_1",
  agentSessionId: "agent_session_1",
  type: "remote_event",
  remoteId: "remote_event_1",
  summary: "Claude emitted an event",
  payload: {
    cursor: "cursor_2",
  },
  createdAt: timestamp,
});

test("creates sessions and transport logs", () => {
  const db = drizzle(new Database(":memory:"));
  db.run(`
    CREATE TABLE agent_sessions (
      id TEXT PRIMARY KEY,
      sync_version INTEGER NOT NULL,
      sync_deleted INTEGER NOT NULL,
      agent_id TEXT NOT NULL,
      parent_agent_session_id TEXT,
      remote_claude_agent_id TEXT,
      remote_claude_session_id TEXT,
      remote_claude_thread_id TEXT,
      context_target_kind TEXT,
      context_target_id TEXT,
      current_notification_id TEXT,
      status TEXT NOT NULL,
      last_activity_at TEXT NOT NULL,
      remote_event_cursor TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE agent_session_logs (
      id TEXT PRIMARY KEY,
      agent_session_id TEXT NOT NULL,
      type TEXT NOT NULL,
      remote_id TEXT,
      summary TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  const agentSessions = createAgentSessionRepository({ db });
  const agentSession = createAgentSession();
  const log = createLog();

  agentSessions.create({ agentSession });
  agentSessions.createLog({ log });

  expect(agentSessions.require({ id: agentSession.id }).remoteClaudeSessionId).toBe(
    "claude_session_1",
  );
  expect(agentSessions.listByAgent({ agentId: "agent_1" })).toHaveLength(1);
  expect(agentSessions.listLogs({ agentSessionId: agentSession.id })).toEqual([log]);

  const updated = agentSessions.update({
    agentSession: {
      ...agentSession,
      status: "idle",
      updatedAt: "2026-05-12T12:01:00.000Z",
    },
  });

  expect(updated.status).toBe("idle");
});
