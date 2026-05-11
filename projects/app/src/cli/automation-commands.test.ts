import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { getDb } from "../data/db/client";
import { computeTargets } from "../data/db/schema";
import { runExecCommand } from "./automation-commands";
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
});

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
