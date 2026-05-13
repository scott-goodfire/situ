import { REVIEWS_SYNC_PREFIX } from "./sync";

export const reviewsModule = {
  name: "@situ/reviews",
  syncPrefix: REVIEWS_SYNC_PREFIX,
} as const;
