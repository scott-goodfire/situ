import { describe, expect, test } from "bun:test";

import { coerceRecord, parseRecord } from "./parse-record";

describe("parseRecord", () => {
  test("returns the parsed object for valid JSON object input", () => {
    expect(parseRecord({ raw: '{"a":1}' })).toEqual({ a: 1 });
  });

  test("returns {} for empty input", () => {
    expect(parseRecord({ raw: "" })).toEqual({});
  });

  test("returns {} for malformed JSON", () => {
    expect(parseRecord({ raw: "not json" })).toEqual({});
  });

  test("returns {} for JSON arrays and primitives", () => {
    expect(parseRecord({ raw: "[]" })).toEqual({});
    expect(parseRecord({ raw: '"string"' })).toEqual({});
    expect(parseRecord({ raw: "42" })).toEqual({});
  });
});

describe("coerceRecord", () => {
  test("returns the value when it's a plain object", () => {
    expect(coerceRecord({ value: { a: 1 } })).toEqual({ a: 1 });
  });

  test("returns {} for arrays, primitives, null, undefined", () => {
    expect(coerceRecord({ value: [] })).toEqual({});
    expect(coerceRecord({ value: 42 })).toEqual({});
    expect(coerceRecord({ value: "string" })).toEqual({});
    expect(coerceRecord({ value: null })).toEqual({});
    expect(coerceRecord({ value: undefined })).toEqual({});
  });
});
