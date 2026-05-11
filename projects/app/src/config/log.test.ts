import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { logLevel, logOutputMode } from "./log";

const originalEnv = {
  SITU_LOG_LEVEL: process.env.SITU_LOG_LEVEL,
  SITU_LOG_OUTPUT: process.env.SITU_LOG_OUTPUT,
};

describe("log config", () => {
  beforeEach(() => {
    delete process.env.SITU_LOG_LEVEL;
    delete process.env.SITU_LOG_OUTPUT;
  });

  afterEach(() => {
    setEnv("SITU_LOG_LEVEL", originalEnv.SITU_LOG_LEVEL);
    setEnv("SITU_LOG_OUTPUT", originalEnv.SITU_LOG_OUTPUT);
  });

  test("defaults to info for missing or invalid levels", () => {
    expect(logLevel()).toBe("info");

    process.env.SITU_LOG_LEVEL = "verbose";
    expect(logLevel()).toBe("info");
  });

  test("accepts known log levels", () => {
    process.env.SITU_LOG_LEVEL = " debug ";

    expect(logLevel()).toBe("debug");
  });

  test("chooses output mode from stderr", () => {
    expect(logOutputMode({ stderrIsTty: true })).toBe("human");
    expect(logOutputMode({ stderrIsTty: false })).toBe("json");
    expect(logOutputMode({ stderrIsTty: undefined })).toBe("json");
  });

  test("SITU_LOG_OUTPUT overrides TTY detection", () => {
    process.env.SITU_LOG_OUTPUT = "human";
    expect(logOutputMode({ stderrIsTty: false })).toBe("human");

    process.env.SITU_LOG_OUTPUT = " JSON ";
    expect(logOutputMode({ stderrIsTty: true })).toBe("json");

    process.env.SITU_LOG_OUTPUT = "garbage";
    expect(logOutputMode({ stderrIsTty: true })).toBe("human");
  });
});

function setEnv(key: keyof typeof originalEnv, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
