import { AGENT_SESSIONS_SYNC_PREFIX } from "./sync";

export const agentSessionsModule = {
  name: "@situ/agent-sessions",
  syncPrefix: AGENT_SESSIONS_SYNC_PREFIX,
} as const;
