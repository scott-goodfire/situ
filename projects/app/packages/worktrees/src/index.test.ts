import { afterEach, expect, test } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { filterCommandEnv, resolveWorkspacePath, runWorkspaceCommand } from ".";

const workspacePath = join(tmpdir(), "situ-worktrees-test");

afterEach(() => {
  rmSync(workspacePath, {
    force: true,
    recursive: true,
  });
});

test("resolves paths inside a workspace", () => {
  mkdirSync(workspacePath, {
    recursive: true,
  });

  expect(resolveWorkspacePath({ requestedPath: ".", workspacePath })).toBe(workspacePath);
  expect(() =>
    resolveWorkspacePath({
      requestedPath: "../outside",
      workspacePath,
    }),
  ).toThrow("Path must stay inside the workspace");
});

test("filters command environment variables", () => {
  expect(
    filterCommandEnv({
      allowlist: ["PATH"],
      env: {
        PATH: "/bin",
        SECRET: "no",
      },
    }),
  ).toEqual({
    PATH: "/bin",
  });
});

test("runs commands with captured output", async () => {
  mkdirSync(workspacePath, {
    recursive: true,
  });

  const result = await runWorkspaceCommand({
    args: ["hello"],
    command: "echo",
    timeoutMs: 1_000,
    workspacePath,
  });

  expect(result.exitCode).toBe(0);
  expect(result.stdout.trim()).toBe("hello");
  expect(result.timedOut).toBe(false);
});
