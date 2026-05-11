import { describe, expect, test } from "bun:test";

import { obs } from "./names";

describe("observability names", () => {
  test("uses dotted Situ names for app spans, logs, and attributes", () => {
    expect(leafValues(obs.span).every(isDottedSituName)).toBe(true);
    expect(leafValues(obs.log).every(isDottedSituName)).toBe(true);
    expect(leafValues(obs.attr).every(isDottedSituName)).toBe(true);
  });

  test("does not duplicate names inside each namespace", () => {
    expect(duplicateNames(leafValues(obs.span))).toEqual([]);
    expect(duplicateNames(leafValues(obs.log))).toEqual([]);
    expect(duplicateNames(leafValues(obs.attr))).toEqual([]);
  });
});

function leafValues(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [];
  }
  return Object.values(value).flatMap((item) => leafValues(item));
}

function isDottedSituName(value: string): boolean {
  return value.startsWith("situ.") && value.includes(".");
}

function duplicateNames(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return [...duplicates].sort();
}
