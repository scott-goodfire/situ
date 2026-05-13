import type { IsoTimestamp, SyncMetadata, TargetRef } from "@situ/common";

export const AGENT_SESSION_STATUSES = ["active", "idle", "failed", "closed"] as const;

export type AgentSessionStatus = (typeof AGENT_SESSION_STATUSES)[number];

export const AGENT_SESSION_LOG_TYPES = ["remote_event", "tool_call", "tool_result"] as const;

export type AgentSessionLogType = (typeof AGENT_SESSION_LOG_TYPES)[number];

export type AgentSessionRecord = SyncMetadata & {
  id: string;
  agentId: string;
  parentAgentSessionId?: string;
  remoteClaudeAgentId?: string;
  remoteClaudeSessionId?: string;
  remoteClaudeThreadId?: string;
  context?: TargetRef;
  currentNotificationId?: string;
  status: AgentSessionStatus;
  lastActivityAt: IsoTimestamp;
  remoteEventCursor?: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
};

export type AgentSessionLogRecord = {
  id: string;
  agentSessionId: string;
  type: AgentSessionLogType;
  remoteId?: string;
  summary: string;
  payload: Record<string, unknown>;
  createdAt: IsoTimestamp;
};
