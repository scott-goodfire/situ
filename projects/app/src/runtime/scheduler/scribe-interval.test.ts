import { describe, expect, test } from "bun:test";

import { scribeIntervalMs } from "./scribe-interval";

describe("scribeIntervalMs", () => {
  test("holds at 20s for the first 3 minutes", () => {
    expect(scribeIntervalMs({ sessionAgeSeconds: 0 })).toBe(20_000);
    expect(scribeIntervalMs({ sessionAgeSeconds: 90 })).toBe(20_000);
    expect(scribeIntervalMs({ sessionAgeSeconds: 180 })).toBe(20_000);
  });

  test("reaches 3 minutes (180s) at hour 12", () => {
    expect(scribeIntervalMs({ sessionAgeSeconds: 12 * 3600 })).toBe(180_000);
  });

  test("reaches 5 minutes (300s) at hour 24", () => {
    expect(scribeIntervalMs({ sessionAgeSeconds: 24 * 3600 })).toBe(300_000);
  });

  test("caps at 5 minutes past hour 24", () => {
    expect(scribeIntervalMs({ sessionAgeSeconds: 48 * 3600 })).toBe(300_000);
    expect(scribeIntervalMs({ sessionAgeSeconds: 7 * 24 * 3600 })).toBe(300_000);
  });

  test("grows monotonically", () => {
    let previous = scribeIntervalMs({ sessionAgeSeconds: 0 });
    for (let hour = 1; hour <= 24; hour += 1) {
      const current = scribeIntervalMs({ sessionAgeSeconds: hour * 3600 });
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });
});
