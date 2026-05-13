import { expect, test } from "bun:test";

import { COMMENTS_SYNC_PREFIX, commentsModule } from ".";

test("exports comment module metadata", () => {
  expect(commentsModule.name).toBe("@situ/comments");
  expect(COMMENTS_SYNC_PREFIX).toBe("comments");
});
