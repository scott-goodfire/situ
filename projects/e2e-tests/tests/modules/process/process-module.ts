import type { ChildProcess } from "node:child_process";

function isRunning({ child }: { child: ChildProcess }): boolean {
  return child.exitCode === null && child.signalCode === null;
}

async function stop({ child }: { child: ChildProcess }): Promise<void> {
  if (!isRunning({ child })) {
    return;
  }

  const exited = new Promise<void>((resolveExit) => {
    child.once("exit", () => resolveExit());
  });
  child.kill("SIGTERM");
  await Promise.race([
    exited,
    new Promise<void>((resolveTimeout) => {
      setTimeout(resolveTimeout, 5_000);
    }),
  ]);
  if (isRunning({ child })) {
    child.kill("SIGKILL");
    await exited;
  }
}

export const processModule = {
  isRunning,
  stop,
} as const;
