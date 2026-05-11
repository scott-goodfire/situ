import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { jsonModule } from "../../modules/json";

const EVALS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

export type RunBridgeCommandOptions = Readonly<{
  runnerEntryUrl: URL;
  args: readonly string[];
  timeoutMs: number;
  streamStderr?: boolean;
}>;

export async function runBridgeCommand<Result>({
  runnerEntryUrl,
  args,
  timeoutMs,
  streamStderr = false,
}: RunBridgeCommandOptions): Promise<Result> {
  const runnerPath = fileURLToPath(runnerEntryUrl);
  const result = await spawnRunner({
    cmd: ["bun", "run", runnerPath, ...args],
    cwd: EVALS_ROOT,
    timeoutMs,
    streamStderr,
  });
  if (result.exitCode !== 0 || result.timedOut) {
    throw new Error(
      [
        `World bridge failed: ${runnerPath} ${args.join(" ")}`,
        `exit: ${String(result.exitCode)}`,
        `timedOut: ${String(result.timedOut)}`,
        "stdout:",
        result.stdout,
        "stderr:",
        result.stderr,
      ].join("\n"),
    );
  }
  return jsonModule.parse<Result>({ text: result.stdout });
}

type SpawnResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

function spawnRunner({
  cmd,
  cwd,
  timeoutMs,
  streamStderr,
}: {
  cmd: [string, ...string[]];
  cwd: string;
  timeoutMs: number;
  streamStderr: boolean;
}): Promise<SpawnResult> {
  return new Promise((resolveResult) => {
    const [head, ...tail] = cmd;
    const child = spawn(head, tail, {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timeout: ReturnType<typeof setTimeout>;
    const finish = (result: SpawnResult) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      // eslint-disable-next-line promise/no-multiple-resolved -- finish is guarded by settled.
      resolveResult(result);
    };
    timeout = setTimeout(() => {
      child.kill();
      finish({ exitCode: null, stdout, stderr, timedOut: true });
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
      if (streamStderr) {
        process.stderr.write(chunk);
      }
    });
    child.on("close", (exitCode) => {
      finish({ exitCode, stdout, stderr, timedOut: false });
    });
  });
}
