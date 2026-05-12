import { describe, expect, test } from "bun:test";

import { clampNumber } from "./clamp-number";

describe("clampNumber", () => {
  test("returns the value when within bounds", () => {
    expect(clampNumber({ value: 5, min: 1, max: 10 })).toBe(5);
  });

  test("clamps to min when below", () => {
    expect(clampNumber({ value: 0, min: 1, max: 10 })).toBe(1);
  });

  test("clamps to max when above", () => {
    expect(clampNumber({ value: 99, min: 1, max: 10 })).toBe(10);
  });

  test("falls back to min when value is not finite", () => {
    expect(clampNumber({ value: Number.NaN, min: 5, max: 10 })).toBe(5);
    expect(clampNumber({ value: Number.POSITIVE_INFINITY, min: 5, max: 10 })).toBe(5);
  });

  test("truncates fractional values", () => {
    expect(clampNumber({ value: 7.9, min: 1, max: 10 })).toBe(7);
  });
});
