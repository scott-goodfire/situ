export const AGENT_MUTATIONS = ["agent/create", "agent/update_status"] as const;

export type AgentMutationName = (typeof AGENT_MUTATIONS)[number];
