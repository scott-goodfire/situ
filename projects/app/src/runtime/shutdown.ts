import { logModule } from "../modules/log";
import { obs } from "../observability";
import type { RuntimeScheduler } from "./scheduler";

type StoppableServer = {
  stop: (closeActiveConnections?: boolean) => void | Promise<void>;
};

type Closeable = {
  close: () => void | Promise<void>;
};

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
    await scheduler.stop();
    await server.stop(true);
    for (const closeable of closeables) {
      try {
        await closeable.close();
      } catch (error) {
        logModule.warn(obs.log.shutdown.closeableFailed, { error });
      }
    }
    process.exit(0);
  };

  process.once("SIGINT", () => {
    void stop({ signal: "SIGINT" });
  });
  process.once("SIGTERM", () => {
    void stop({ signal: "SIGTERM" });
  });
}
