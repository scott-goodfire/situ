import { reviews } from "./schema";

export const REVIEWS_SYNC_PREFIX = "reviews";

export const reviewsSyncSerializer = {
  prefix: REVIEWS_SYNC_PREFIX,
  table: reviews,
  serialize: ({ row }: { row: Record<string, unknown> }) => row,
};
