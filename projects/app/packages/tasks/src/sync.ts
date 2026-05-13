import { labels, tasks } from "./schema";

export const TASKS_SYNC_PREFIX = "tasks";
export const LABELS_SYNC_PREFIX = "labels";

export const tasksSyncSerializer = {
  prefix: TASKS_SYNC_PREFIX,
  table: tasks,
  serialize: ({ row }: { row: Record<string, unknown> }) => row,
};

export const labelsSyncSerializer = {
  prefix: LABELS_SYNC_PREFIX,
  table: labels,
  serialize: ({ row }: { row: Record<string, unknown> }) => row,
};
