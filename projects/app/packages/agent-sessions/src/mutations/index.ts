export const AGENT_SESSION_MUTATIONS = [
  "agent_session/create",
  "agent_session/update_status",
] as const;

export type AgentSessionMutationName = (typeof AGENT_SESSION_MUTATIONS)[number];
