export type CommandResult = Readonly<{
  cmd: string[];
  cwd: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}>;

export async function runCommand({
  cmd,
  cwd,
  env,
  timeoutMs = 30_000,
  streamStderr = false,
}: {
  cmd: string[];
  cwd: string;
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
  streamStderr?: boolean;
}): Promise<CommandResult> {
  const child = Bun.spawn({
    cmd,
    cwd,
    env: commandEnv({ env }),
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = readPipe({ pipe: child.stdout });
  const stderr = readPipe({
    pipe: child.stderr,
    onChunk: streamStderr
      ? (chunk) => {
          process.stderr.write(chunk);
        }
      : undefined,
  });
  const timeout = sleep({ ms: timeoutMs }).then(() => "timeout" as const);
  const status = await Promise.race([child.exited, timeout]);

  if (status === "timeout") {
    child.kill();
    return {
      cmd,
      cwd,
      exitCode: await child.exited.catch(() => null),
      stdout: await stdout,
      stderr: await stderr,
      timedOut: true,
    };
  }

  return {
    cmd,
    cwd,
    exitCode: status,
    stdout: await stdout,
    stderr: await stderr,
    timedOut: false,
  };
}

export function requireSuccessfulCommand({ result }: { result: CommandResult }): void {
  if (result.exitCode === 0 && !result.timedOut) {
    return;
  }
  throw new Error(
    [
      `Command failed: ${result.cmd.join(" ")}`,
      `cwd: ${result.cwd}`,
      `exit: ${String(result.exitCode)}`,
      `timedOut: ${String(result.timedOut)}`,
      "stdout:",
      result.stdout,
      "stderr:",
      result.stderr,
    ].join("\n"),
  );
}

function commandEnv({ env }: { env?: Record<string, string | undefined> }): Record<string, string> {
  const merged = { ...process.env, ...env };
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

async function readPipe({
  pipe,
  onChunk,
}: {
  pipe: ReadableStream<Uint8Array>;
  onChunk?: (chunk: string) => void;
}): Promise<string> {
  const reader = pipe.getReader();
  const decoder = new TextDecoder();
  let output = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const chunk = decoder.decode(value, { stream: true });
      output += chunk;
      onChunk?.(chunk);
    }
  } finally {
    const tail = decoder.decode();
    output += tail;
    onChunk?.(tail);
  }
  return output;
}

async function sleep({ ms }: { ms: number }): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
