import { httpInstrumentationMiddleware } from "@hono/otel";
import { honoLogLayer } from "@loglayer/hono";
import type { Hono } from "hono";

import { isOtlpTracingEnabled, observabilityServiceName } from "../config/observability";
import { rootLogLayer } from "./logger";

export function installObservabilityMiddleware({ app }: { app: Hono }): void {
  if (isOtlpTracingEnabled()) {
    app.use(
      "*",
      httpInstrumentationMiddleware({
        serviceName: observabilityServiceName,
      }),
    );
  }

  app.use(
    "*",
    honoLogLayer({
      instance: rootLogLayer,
      autoLogging: {
        logLevel: "debug",
        ignore: [/^\/assets\//],
      },
      contextFn: ({ request, path }) => ({
        method: request.method,
        path,
      }),
    }),
  );
}
