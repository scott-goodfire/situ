import { afterEach, describe, expect, test } from "bun:test";

import {
  defaultMaxScientistConcurrency,
  defaultMaxVerifierConcurrency,
  maxScientistConcurrency,
  maxVerifierConcurrency,
} from "./runtime";

const originalEnv = {
  MAX_SITU_SCIENTIST_CONCURRENCY: process.env.MAX_SITU_SCIENTIST_CONCURRENCY,
  MAX_SITU_VERIFIER_CONCURRENCY: process.env.MAX_SITU_VERIFIER_CONCURRENCY,
};

describe("runtime config", () => {
  afterEach(() => {
    setEnv("MAX_SITU_SCIENTIST_CONCURRENCY", originalEnv.MAX_SITU_SCIENTIST_CONCURRENCY);
    setEnv("MAX_SITU_VERIFIER_CONCURRENCY", originalEnv.MAX_SITU_VERIFIER_CONCURRENCY);
  });

  test("defaults maximum Scientist concurrency", () => {
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

  test("defaults maximum Verifier concurrency", () => {
    delete process.env.MAX_SITU_VERIFIER_CONCURRENCY;

    expect(maxVerifierConcurrency()).toBe(defaultMaxVerifierConcurrency);
  });

  test("reads positive integer maximum Verifier concurrency", () => {
    process.env.MAX_SITU_VERIFIER_CONCURRENCY = " 64 ";

    expect(maxVerifierConcurrency()).toBe(64);
  });

  test("falls back for invalid maximum Verifier concurrency values", () => {
    process.env.MAX_SITU_VERIFIER_CONCURRENCY = "0";
    expect(maxVerifierConcurrency()).toBe(defaultMaxVerifierConcurrency);

    process.env.MAX_SITU_VERIFIER_CONCURRENCY = "many";
    expect(maxVerifierConcurrency()).toBe(defaultMaxVerifierConcurrency);
  });
});

function setEnv(key: keyof typeof originalEnv, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
