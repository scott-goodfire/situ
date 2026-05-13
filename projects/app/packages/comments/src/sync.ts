import { comments } from "./schema";

export const COMMENTS_SYNC_PREFIX = "comments";

export const commentsSyncSerializer = {
  prefix: COMMENTS_SYNC_PREFIX,
  table: comments,
  serialize: ({ row }: { row: Record<string, unknown> }) => row,
};
