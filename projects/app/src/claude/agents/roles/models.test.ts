import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { DEFAULT_EFFORT, effortFromEnv, modelForEffort } from "./models";

describe("modelForEffort", () => {
  test("medium resolves to the sonnet model", () => {
    expect(modelForEffort({ effort: "medium" })).toBe("claude-sonnet-4-6");
  });

  test("high resolves to the opus model", () => {
    expect(modelForEffort({ effort: "high" })).toBe("claude-opus-4-7");
  });
});

describe("effortFromEnv", () => {
  const originalEffort = process.env.SITU_EFFORT;

  beforeEach(() => {
    delete process.env.SITU_EFFORT;
  });

  afterEach(() => {
    if (originalEffort === undefined) {
      delete process.env.SITU_EFFORT;
    } else {
      process.env.SITU_EFFORT = originalEffort;
    }
  });

  test("defaults to high when unset", () => {
    expect(effortFromEnv()).toBe(DEFAULT_EFFORT);
    expect(DEFAULT_EFFORT).toBe("high");
  });

  test("honors valid SITU_EFFORT values case-insensitively", () => {
    process.env.SITU_EFFORT = "high";
    expect(effortFromEnv()).toBe("high");
    process.env.SITU_EFFORT = "HIGH";
    expect(effortFromEnv()).toBe("high");
    process.env.SITU_EFFORT = " Medium ";
    expect(effortFromEnv()).toBe("medium");
  });

  test("falls back to the default for unknown values", () => {
    process.env.SITU_EFFORT = "ultra";
    expect(effortFromEnv()).toBe("high");
    process.env.SITU_EFFORT = "low";
    expect(effortFromEnv()).toBe("high");
    process.env.SITU_EFFORT = "";
    expect(effortFromEnv()).toBe("high");
  });
});
