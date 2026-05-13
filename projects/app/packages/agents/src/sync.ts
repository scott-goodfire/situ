import { agents } from "./schema";

export const AGENTS_SYNC_PREFIX = "agents";

export const agentsSyncSerializer = {
  prefix: AGENTS_SYNC_PREFIX,
  table: agents,
  serialize: ({ row }: { row: Record<string, unknown> }) => row,
};
