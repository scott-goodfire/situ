import { currentSyncVersion, subscribeSyncPokes } from "../data/db/sync";
import { logModule } from "../modules/log";
import { obs } from "../observability";

export function createReplicachePokeResponse({ signal }: { signal: AbortSignal }): Response {
  const encoder = new TextEncoder();
  let closed = false;
  let unsubscribe: (() => void) | undefined;
  let versionPoll: ReturnType<typeof setInterval> | undefined;
  let keepAlive: ReturnType<typeof setInterval> | undefined;

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      let lastSentVersion = 0;
      const write = ({ chunk }: { chunk: string }) => {
        if (!closed) {
          controller.enqueue(encoder.encode(chunk));
        }
      };
      const sendPokeIfChanged = async () => {
        if (closed) {
          return;
        }
        try {
          const version = await currentSyncVersion();
          if (version > lastSentVersion) {
            lastSentVersion = version;
            write({
              chunk: `event: poke\ndata: ${JSON.stringify({ version })}\n\n`,
            });
          }
        } catch (error) {
          logModule.error(obs.log.sync.replicachePokeStreamFailed, { error });
        }
      };
      const close = () => {
        if (closed) {
          return;
        }
        closed = true;
        unsubscribe?.();
        if (versionPoll) {
          clearInterval(versionPoll);
        }
        if (keepAlive) {
          clearInterval(keepAlive);
        }
        try {
          controller.close();
        } catch {
          // The browser may close the EventSource before the stream observes abort.
        }
      };

      write({ chunk: "retry: 3000\n\n" });
      unsubscribe = subscribeSyncPokes({
        listener: () => {
          void sendPokeIfChanged();
        },
      });
      versionPoll = setInterval(() => {
        void sendPokeIfChanged();
      }, 500);
      keepAlive = setInterval(() => {
        write({ chunk: ": keepalive\n\n" });
      }, 25_000);
      void sendPokeIfChanged();
      signal.addEventListener("abort", close, { once: true });
    },
    cancel() {
      closed = true;
      unsubscribe?.();
      if (versionPoll) {
        clearInterval(versionPoll);
      }
      if (keepAlive) {
        clearInterval(keepAlive);
      }
    },
  });

  return new Response(body, {
    headers: {
      "cache-control": "no-store, no-cache, no-transform",
      connection: "keep-alive",
      "content-type": "text/event-stream; charset=utf-8",
      "x-accel-buffering": "no",
    },
  });
}
