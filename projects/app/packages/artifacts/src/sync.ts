import { artifacts } from "./schema";

export const ARTIFACTS_SYNC_PREFIX = "artifacts";

export const artifactsSyncSerializer = {
  prefix: ARTIFACTS_SYNC_PREFIX,
  table: artifacts,
  serialize: ({ row }: { row: Record<string, unknown> }) => row,
};
