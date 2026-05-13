import { agentSessions } from "./schema";

export const AGENT_SESSIONS_SYNC_PREFIX = "agent_sessions";

export const agentSessionsSyncSerializer = {
  prefix: AGENT_SESSIONS_SYNC_PREFIX,
  table: agentSessions,
  serialize: ({ row }: { row: Record<string, unknown> }) => {
    const {
      remoteClaudeAgentId: _remoteClaudeAgentId,
      remoteClaudeSessionId: _remoteClaudeSessionId,
      remoteClaudeThreadId: _remoteClaudeThreadId,
      remoteEventCursor: _remoteEventCursor,
      ...publicRow
    } = row;

    return publicRow;
  },
};
