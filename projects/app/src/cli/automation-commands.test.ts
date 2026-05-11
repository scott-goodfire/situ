import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { getDb } from "../data/db/client";
import { computeTargets } from "../data/db/schema";
import { armExecHardExitWatchdog, runExecCommand } from "./automation-commands";
import { startRuntimeApp } from "./runtime-app";

const originalEnv = {
  SITU_ANTHROPIC_KEY: process.env.SITU_ANTHROPIC_KEY,
  SITU_DB_PATH: process.env.SITU_DB_PATH,
  SITU_HOME: process.env.SITU_HOME,
  SITU_REPO_PATH: process.env.SITU_REPO_PATH,
};

let tempRoot: string;

describe("runExecCommand", () => {
  beforeAll(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "situ-exec-command-"));
    const repoPath = join(tempRoot, "repo");
    const sessionHome = join(tempRoot, "state", "sessions", "ses_cli_exec");
    await mkdir(repoPath, { recursive: true });
    await mkdir(sessionHome, { recursive: true });
    process.env.SITU_HOME = join(tempRoot, "state");
    process.env.SITU_REPO_PATH = repoPath;
    process.env.SITU_DB_PATH = join(sessionHome, "session.sqlite");
    process.env.SITU_ANTHROPIC_KEY = "sk-ant-test-cli";
  });

  afterAll(async () => {
    restoreEnv();
    await rm(tempRoot, { recursive: true, force: true });
  });

  test("requires an objective unless targeting a session", async () => {
    await expect(runExecCommand({ argv: [] })).rejects.toThrow(
      "objective is required unless --session is provided",
    );
  });

  test("returns exit code 5 when automation times out", async () => {
    let teardownCount = 0;

    const result = await withCapturedConsole(() =>
      runExecCommand({
        argv: ["--session", "ses_cli_exec", "--timeout", "1", "--json"],
        beforeAutomation: async ({ runtime, server }) => {
          expect(runtime.sessionId).toBe("ses_cli_exec");
          expect(server).toEqual({
            host: "127.0.0.1",
            port: 5500,
            allowPortFallback: true,
          });
          return {
            webUrl: "http://127.0.0.1:5500/",
            teardown: async () => {
              teardownCount += 1;
            },
          };
        },
      }),
    );
    expect(result.value).toBe(5);
    expect(result.stderr).toContain("[situ-exec] Running headless automation");
    expect(result.stderr).toContain("[situ-exec] Web UI: http://127.0.0.1:5500/");
    expect(result.stderr).toContain("[situ-exec] Session: ses_cli_exec");
    expect(JSON.parse(result.stdout.join("\n"))).toMatchObject({
      sessionId: "ses_cli_exec",
      webUrl: "http://127.0.0.1:5500/",
      summary: { status: "timeout" },
    });
    expect(teardownCount).toBe(1);
  });

  test("registers compute for a fresh exec objective", async () => {
    const result = await withCapturedConsole(() =>
      runExecCommand({
        argv: [
          "--objective",
          "Register compute during exec.",
          "--timeout",
          "1",
          "--compute-pool",
          "local",
          "--compute-label",
          "gpu0",
          "--cuda-visible-devices",
          "0",
          "--json",
        ],
        beforeAutomation: async () => {
          return {
            teardown: async () => {},
          };
        },
      }),
    );
    expect(result.value).toBe(5);

    const target = (await getDb().select().from(computeTargets)).find(
      (candidate) => candidate.label === "gpu0",
    );
    expect(target).toMatchObject({
      pool: "local",
      kind: "local",
      label: "gpu0",
    });
    expect(JSON.parse(target?.metadataJson ?? "{}")).toEqual({ cuda_visible_devices: "0" });
  });

  test("app runtime owns scheduler startup and local compute bootstrap", async () => {
    getDb().delete(computeTargets).run();
    const previousSchedulerDisabled = process.env.SITU_DISABLE_SCHEDULER;
    process.env.SITU_DISABLE_SCHEDULER = "1";

    let runtimeApp: Awaited<ReturnType<typeof startRuntimeApp>> | undefined;
    try {
      runtimeApp = await startRuntimeApp({
        server: { host: "127.0.0.1", port: 0, allowPortFallback: false },
        installProcessShutdownHandlers: false,
        appMode: { kind: "prod", webRoot: tempRoot },
      });
      expect(runtimeApp.webUrl.startsWith("http://127.0.0.1:")).toBe(true);
      const localTargets = await getDb()
        .select()
        .from(computeTargets)
        .where(eq(computeTargets.pool, "local"));
      expect(localTargets.length).toBeGreaterThan(0);
    } finally {
      if (previousSchedulerDisabled === undefined) {
        delete process.env.SITU_DISABLE_SCHEDULER;
      } else {
        process.env.SITU_DISABLE_SCHEDULER = previousSchedulerDisabled;
      }
      await runtimeApp?.stop();
    }
  });

  test("rejects compute options on session-only paths", async () => {
    await expect(
      runExecCommand({
        argv: ["--session", "ses_cli_exec", "--compute-pool", "local"],
      }),
    ).rejects.toThrow("compute options are only supported");
  });

  test("hard-exit watchdog fires onExit with the correct code if not cancelled", async () => {
    const exits: number[] = [];
    const warnings: string[] = [];
    armExecHardExitWatchdog({
      exitCode: 5,
      delayMs: 20,
      onExit: (code) => exits.push(code),
      onWarn: (message) => warnings.push(message),
    });

    await sleep(60);

    expect(exits).toEqual([5]);
    expect(warnings[0]).toContain("Teardown exceeded 20ms");
    expect(warnings[0]).toContain("forcing exit 5");
  });

  test("hard-exit watchdog stays silent when cancelled before the delay elapses", async () => {
    const exits: number[] = [];
    const watchdog = armExecHardExitWatchdog({
      exitCode: 5,
      delayMs: 50,
      onExit: (code) => exits.push(code),
      onWarn: () => {},
    });
    watchdog.cancel();

    await sleep(100);

    expect(exits).toEqual([]);
  });

  test("runExecCommand cancels the hard-exit watchdog after teardown completes", async () => {
    // Regression: previously the watchdog timer was armed but never
    // cancelled. With .unref() it didn't block the event loop, but it would
    // still fire its setTimeout callback ~5s later, calling process.exit and
    // killing whatever was running in the shared process (e.g. the next
    // test in the suite, or CI's test runner). Cancelling on the
    // successful-teardown path keeps the timer scoped to this invocation.
    const exits: number[] = [];

    await withCapturedConsole(() =>
      runExecCommand({
        argv: ["--session", "ses_cli_exec", "--timeout", "1", "--json"],
        beforeAutomation: async () => ({
          teardown: async () => {},
        }),
        armWatchdog: (opts) =>
          armExecHardExitWatchdog({
            ...opts,
            delayMs: 50,
            onExit: (code) => exits.push(code),
            onWarn: () => {},
          }),
      }),
    );

    // Wait well past the (50ms) delay. If runExecCommand failed to cancel
    // the watchdog, the injected onExit would have been called by now.
    await sleep(200);

    expect(exits).toEqual([]);
  });
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function restoreEnv(): void {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

async function withCapturedConsole<T>(
  fn: () => Promise<T>,
): Promise<{ value: T; stdout: string[]; stderr: string[] }> {
  const originalLog = console.log;
  const originalError = console.error;
  const stdout: string[] = [];
  const stderr: string[] = [];
  console.log = (value?: unknown) => {
    stdout.push(String(value));
  };
  console.error = (value?: unknown) => {
    stderr.push(String(value));
  };
  try {
    return { value: await fn(), stdout, stderr };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}
