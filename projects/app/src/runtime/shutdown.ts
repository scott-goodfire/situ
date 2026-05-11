import { logModule } from "../modules/log";
import { obs } from "../observability";
import type { RuntimeScheduler } from "./scheduler";

type StoppableServer = {
  stop: (closeActiveConnections?: boolean) => void | Promise<void>;
};

type Closeable = {
  close: () => void | Promise<void>;
};

const SHUTDOWN_HARD_EXIT_MS = 5_000;

export function installShutdownHandlers({
  server,
  scheduler,
  closeables = [],
}: {
  server: StoppableServer;
  scheduler: RuntimeScheduler;
  closeables?: Closeable[];
}): void {
  let stopping = false;
  const stop = async ({ signal }: { signal: string }) => {
    if (stopping) {
      return;
    }
    stopping = true;
    logModule.info(obs.log.shutdown.signalReceived, { [obs.attr.shutdown.signal]: signal });
    const hardExitTimer = setTimeout(() => {
      console.error(
        `[situ] Shutdown exceeded ${SHUTDOWN_HARD_EXIT_MS}ms; forcing exit after ${signal}.`,
      );
      process.exit(0);
    }, SHUTDOWN_HARD_EXIT_MS);
    hardExitTimer.unref();
    await scheduler.stop();
    await server.stop(true);
    for (const closeable of closeables) {
      try {
        await closeable.close();
      } catch (error) {
        logModule.warn(obs.log.shutdown.closeableFailed, { error });
      }
    }
    clearTimeout(hardExitTimer);
    process.exit(0);
  };

  process.once("SIGINT", () => {
    void stop({ signal: "SIGINT" });
  });
  process.once("SIGTERM", () => {
    void stop({ signal: "SIGTERM" });
  });
}
