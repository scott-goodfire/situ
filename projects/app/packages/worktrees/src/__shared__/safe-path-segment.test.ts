import { describe, expect, test } from "bun:test";

import { safePathSegment } from "./safe-path-segment";

describe("safePathSegment", () => {
  test("preserves alphanumerics and -._", () => {
    expect(safePathSegment({ value: "abc-123_v.2" })).toBe("abc-123_v.2");
  });

  test("replaces unsafe characters with underscores", () => {
    expect(safePathSegment({ value: "exp/with spaces!" })).toBe("exp_with_spaces_");
  });

  test("collapses repeated unsafe characters individually", () => {
    expect(safePathSegment({ value: "a//b" })).toBe("a__b");
  });
});
