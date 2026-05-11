import { describe, expect, test } from "bun:test";

import { runReportCommand } from "./report-command";

describe("runReportCommand argv parsing", () => {
  test("rejects invocations without a <session-id> positional", async () => {
    await expect(runReportCommand({ argv: [] })).rejects.toThrow(
      "situ report requires a <session-id> positional argument.",
    );
  });

  test("rejects more than one positional argument", async () => {
    await expect(runReportCommand({ argv: ["ses_a", "ses_b"] })).rejects.toThrow(
      "exactly one <session-id> positional argument",
    );
  });

  test("rejects unsupported --effort values before reaching the runner", async () => {
    await expect(runReportCommand({ argv: ["ses_a", "--effort", "low"] })).rejects.toThrow(
      "--effort must be one of",
    );
  });

  test("--help prints usage and returns 0 without invoking the runner", async () => {
    const restore = captureConsoleLog();
    try {
      const exit = await runReportCommand({ argv: ["--help"] });
      expect(exit).toBe(0);
      expect(restore.lines.join("\n")).toContain("usage: situ report <session-id>");
    } finally {
      restore.restore();
    }
  });
});

function captureConsoleLog(): { lines: string[]; restore: () => void } {
  const lines: string[] = [];
  const originalLog = console.log;
  console.log = (value?: unknown) => {
    lines.push(String(value));
  };
  return {
    lines,
    restore: () => {
      console.log = originalLog;
    },
  };
}
