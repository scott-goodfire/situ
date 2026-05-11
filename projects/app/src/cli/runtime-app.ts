import { createApp, type AppMode } from "../server";
import { maxScientistConcurrency, schedulerDisabled, type RuntimeOptions } from "../config/runtime";
import { logModule } from "../modules/log";
import { obs } from "../observability";
import {
  createViteDevHandler,
  hasSpaAssets,
  missingSpaAssets,
  resolveSpaAssets,
  sourceSpaRootPath,
  type ViteDevHandler,
} from "../spa";
import { computeModule } from "@situ/compute";
import { createRuntimeScheduler, type RuntimeScheduler } from "../runtime/scheduler";
import { installShutdownHandlers } from "../runtime/shutdown";
import { serveWithPortFallback } from "./server-listen";

export type RuntimeAppCloseable = {
  close: () => void | Promise<void>;
};

export type RuntimeAppHandle = {
  webUrl: string;
  stop: () => Promise<void>;
};

export async function startRuntimeApp({
  server: serverOptions,
  closeables = [],
  installProcessShutdownHandlers = true,
  appMode,
}: {
  server: Pick<RuntimeOptions, "host" | "port" | "allowPortFallback">;
  closeables?: RuntimeAppCloseable[];
  installProcessShutdownHandlers?: boolean;
  appMode?: AppMode;
}): Promise<RuntimeAppHandle> {
  const resolvedApp = appMode
    ? { mode: appMode, viteHandler: undefined }
    : await resolveRuntimeAppMode();
  const app = createApp({ mode: resolvedApp.mode });
  const server = serveWithPortFallback({
    hostname: serverOptions.host,
    port: serverOptions.port,
    allowPortFallback: serverOptions.allowPortFallback,
    fetch: app.fetch,
    idleTimeout: 0,
  });
  let scheduler: RuntimeScheduler;
  try {
    scheduler = await startAppScheduler();
  } catch (error) {
    await server.stop(true);
    throw error;
  }
  const appCloseables = closeablesForRuntimeApp({
    viteHandler: resolvedApp.viteHandler,
    closeables,
  });

  if (installProcessShutdownHandlers) {
    installShutdownHandlers({ server, scheduler, closeables: appCloseables });
  }

  let stopped = false;
  return {
    webUrl: String(server.url),
    stop: async () => {
      if (stopped) {
        return;
      }
      stopped = true;
      await scheduler.stop();
      await server.stop(true);
      for (const closeable of appCloseables) {
        try {
          await closeable.close();
        } catch (error) {
          logModule.warn(obs.log.shutdown.closeableFailed, { error });
        }
      }
    },
  };
}

async function startAppScheduler(): Promise<RuntimeScheduler> {
  const scheduler = createRuntimeScheduler();
  await computeModule.ensureDefaultLocalTargets({ desiredCount: maxScientistConcurrency() });
  if (!schedulerDisabled()) {
    scheduler.start();
  }
  return scheduler;
}

function closeablesForRuntimeApp({
  viteHandler,
  closeables,
}: {
  viteHandler?: ViteDevHandler;
  closeables: RuntimeAppCloseable[];
}): RuntimeAppCloseable[] {
  return viteHandler ? [viteHandler, ...closeables] : [...closeables];
}

async function resolveRuntimeAppMode(): Promise<{
  mode: AppMode;
  viteHandler?: ViteDevHandler;
}> {
  const spaAssets = resolveSpaAssets();
  if (spaAssets.mode === "source") {
    const viteHandler = await createViteDevHandler({ root: sourceSpaRootPath() });
    return { mode: { kind: "dev", vite: viteHandler }, viteHandler };
  }
  if (!hasSpaAssets({ root: spaAssets.root })) {
    const missing = missingSpaAssets({ root: spaAssets.root }).join(", ");
    throw new Error(`SPA assets are missing from ${spaAssets.root}: ${missing}`);
  }
  return { mode: { kind: "prod", webRoot: spaAssets.root } };
}
