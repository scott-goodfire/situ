import { EXPERIMENTS_SYNC_PREFIX } from "./sync";

export const experimentsModule = {
  name: "@situ/experiments",
  syncPrefix: EXPERIMENTS_SYNC_PREFIX,
} as const;
