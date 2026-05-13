import { AGENTS_SYNC_PREFIX } from "./sync";

export const agentsModule = {
  name: "@situ/agents",
  syncPrefix: AGENTS_SYNC_PREFIX,
} as const;
