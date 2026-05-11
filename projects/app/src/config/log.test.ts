import { afterEach, describe, expect, test } from "bun:test";

import { logLevel, logOutputMode } from "./log";

const originalEnv = {
  SITU_LOG_LEVEL: process.env.SITU_LOG_LEVEL,
};

describe("log config", () => {
  afterEach(() => {
    setEnv("SITU_LOG_LEVEL", originalEnv.SITU_LOG_LEVEL);
  });

  test("defaults to info for missing or invalid levels", () => {
    delete process.env.SITU_LOG_LEVEL;
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
});

function setEnv(key: keyof typeof originalEnv, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
