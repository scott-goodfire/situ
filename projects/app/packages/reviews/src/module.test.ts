import { expect, test } from "bun:test";

import { REVIEW_STATUSES, reviewsModule } from ".";

test("exports review module metadata", () => {
  expect(reviewsModule.name).toBe("@situ/reviews");
  expect(REVIEW_STATUSES).toContain("changes_requested");
});
