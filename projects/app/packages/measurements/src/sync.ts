import { measurements } from "./schema";

export const MEASUREMENTS_SYNC_PREFIX = "measurements";

export const measurementsSyncSerializer = {
  prefix: MEASUREMENTS_SYNC_PREFIX,
  table: measurements,
  serialize: ({ row }: { row: Record<string, unknown> }) => row,
};
