import { describe, expect, test } from "bun:test";

import { clampRepositoryLimit } from "./clamp-repository-limit";

describe("clampRepositoryLimit", () => {
  test("returns the value when within bounds", () => {
    expect(clampRepositoryLimit({ limit: 5 })).toBe(5);
  });

  test("clamps to min 1 when below", () => {
    expect(clampRepositoryLimit({ limit: 0 })).toBe(1);
    expect(clampRepositoryLimit({ limit: -3 })).toBe(1);
  });

  test("clamps to default max 50 when above", () => {
    expect(clampRepositoryLimit({ limit: 1000 })).toBe(50);
  });

  test("respects an explicit max", () => {
    expect(clampRepositoryLimit({ limit: 1000, max: 25 })).toBe(25);
  });

  test("falls back to default 10 when value is not finite", () => {
    expect(clampRepositoryLimit({ limit: Number.NaN })).toBe(10);
  });

  test("truncates fractional values", () => {
    expect(clampRepositoryLimit({ limit: 7.9 })).toBe(7);
  });
});
