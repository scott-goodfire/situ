import { describe, expect, test } from "bun:test";

import { matchesRepositorySearch } from "./matches-repository-search";

describe("matchesRepositorySearch", () => {
  test("returns true when query is empty or whitespace", () => {
    expect(matchesRepositorySearch({ values: ["a"] })).toBe(true);
    expect(matchesRepositorySearch({ query: "  ", values: ["a"] })).toBe(true);
  });

  test("matches case-insensitively across joined values", () => {
    expect(matchesRepositorySearch({ query: "FOO", values: ["bar foo baz"] })).toBe(true);
    expect(matchesRepositorySearch({ query: "missing", values: ["bar foo baz"] })).toBe(false);
  });

  test("ignores null and undefined values", () => {
    expect(matchesRepositorySearch({ query: "x", values: [null, undefined, "xenon"] })).toBe(true);
  });

  test("includes numeric values in the search corpus", () => {
    expect(matchesRepositorySearch({ query: "42", values: ["unrelated", 42] })).toBe(true);
  });
});
