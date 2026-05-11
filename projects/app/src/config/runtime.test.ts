import { afterEach, describe, expect, test } from "bun:test";

import { defaultMaxScientistConcurrency, maxScientistConcurrency } from "./runtime";

const originalEnv = {
  MAX_SITU_SCIENTIST_CONCURRENCY: process.env.MAX_SITU_SCIENTIST_CONCURRENCY,
};

describe("runtime config", () => {
  afterEach(() => {
    setEnv("MAX_SITU_SCIENTIST_CONCURRENCY", originalEnv.MAX_SITU_SCIENTIST_CONCURRENCY);
  });

  test("defaults maximum Scientist concurrency to four", () => {
    delete process.env.MAX_SITU_SCIENTIST_CONCURRENCY;

    expect(maxScientistConcurrency()).toBe(defaultMaxScientistConcurrency);
  });

  test("reads positive integer maximum Scientist concurrency", () => {
    process.env.MAX_SITU_SCIENTIST_CONCURRENCY = " 5 ";

    expect(maxScientistConcurrency()).toBe(5);
  });

  test("falls back for invalid maximum Scientist concurrency values", () => {
    process.env.MAX_SITU_SCIENTIST_CONCURRENCY = "0";
    expect(maxScientistConcurrency()).toBe(defaultMaxScientistConcurrency);

    process.env.MAX_SITU_SCIENTIST_CONCURRENCY = "many";
    expect(maxScientistConcurrency()).toBe(defaultMaxScientistConcurrency);
  });
});

function setEnv(key: keyof typeof originalEnv, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
