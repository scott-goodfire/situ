import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "bun:test";

import { obs } from "./names";

describe("logger", () => {
  test("writes structured redacted diagnostics to stderr", async () => {
    const appRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
    const script = `
      import { log, obs } from "./src/observability/index.ts";
      log.info(obs.log.sync.pokeListenerFailed, {
        anthropicKey: "sk-ant-secret",
        headers: { authorization: "Bearer secret" },
        token: "plain-token"
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
    `;
    const proc = Bun.spawn({
      cmd: ["bun", "-e", script],
      cwd: appRoot,
      env: {
        ...process.env,
        SITU_LOG_LEVEL: "info",
      },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    expect(exitCode).toBe(0);
    expect(stdout).toBe("");
    expect(stderr).toContain(obs.log.sync.pokeListenerFailed);
    expect(stderr).toContain("[REDACTED]");
    expect(stderr).not.toContain("sk-ant-secret");
    expect(stderr).not.toContain("Bearer secret");
    expect(stderr).not.toContain("plain-token");
  });
});
