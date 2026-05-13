import { COMMENTS_SYNC_PREFIX } from "./sync";

export const commentsModule = {
  name: "@situ/comments",
  syncPrefix: COMMENTS_SYNC_PREFIX,
} as const;
