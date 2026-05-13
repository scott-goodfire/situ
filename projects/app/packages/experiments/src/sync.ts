import { experiments } from "./schema";

export const EXPERIMENTS_SYNC_PREFIX = "experiments";

export const experimentsSyncSerializer = {
  prefix: EXPERIMENTS_SYNC_PREFIX,
  table: experiments,
  serialize: ({ row }: { row: Record<string, unknown> }) => row,
};
