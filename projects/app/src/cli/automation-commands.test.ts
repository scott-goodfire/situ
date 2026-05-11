import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { runExecCommand } from "./automation-commands";

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

  test("requires an objective unless resuming or targeting a session", async () => {
    await expect(runExecCommand({ argv: [] })).rejects.toThrow(
      "objective is required unless --resume or --session is provided",
    );
  });

  test("rejects the removed context option", async () => {
    await expect(
      runExecCommand({ argv: ["--session", "ses_cli_exec", "--context", "extra"] }),
    ).rejects.toThrow("Unknown option `--context`");
  });

  test("returns exit code 2 when automation times out", async () => {
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
    expect(result.value).toBe(2);
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
