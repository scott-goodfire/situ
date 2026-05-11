import { openTelemetryPlugin } from "@loglayer/plugin-opentelemetry";
import { redactionPlugin } from "@loglayer/plugin-redaction";
import { PinoTransport } from "@loglayer/transport-pino";
import { LogLayer } from "loglayer";
import pino, { type Logger as PinoLogger } from "pino";

import { logLevel, logOutputMode } from "../config/log";
import type { SituLogEvent } from "./names";

export type LogFields = Record<string, unknown>;
export type LogMethod = (event: SituLogEvent, fields?: LogFields) => void;

export type SituLogger = Readonly<{
  debug: LogMethod;
  info: LogMethod;
  warn: LogMethod;
  error: LogMethod;
  child: ({ fields }: { fields: LogFields }) => SituLogger;
}>;

export const rootLogLayer = new LogLayer({
  transport: new PinoTransport({
    logger: pinoLogger(),
  }),
  plugins: [
    openTelemetryPlugin({ traceFieldName: "trace" }),
    redactionPlugin({
      paths: [
        "anthropicKey",
        "apiKey",
        "authorization",
        "headers.authorization",
        "password",
        "secret",
        "token",
      ],
      censor: "[REDACTED]",
      strict: false,
    }),
  ],
  contextFieldName: "context",
  metadataFieldName: "metadata",
}).setLevel(logLevel());

export const log = situLogger({ logger: rootLogLayer });

function pinoLogger(): PinoLogger {
  const level = logLevel();
  if (logOutputMode() === "json") {
    return pino(
      {
        level,
        timestamp: pino.stdTimeFunctions.isoTime,
      },
      pino.destination(2),
    );
  }

  return pino({
    level,
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        destination: 2,
        singleLine: true,
        translateTime: "SYS:standard",
      },
    },
  });
}

function situLogger({ logger }: { logger: LogLayer }): SituLogger {
  return {
    debug: (event, fields) => emit({ logger, level: "debug", event, fields }),
    info: (event, fields) => emit({ logger, level: "info", event, fields }),
    warn: (event, fields) => emit({ logger, level: "warn", event, fields }),
    error: (event, fields) => emit({ logger, level: "error", event, fields }),
    child: ({ fields }) => situLogger({ logger: logger.child().withContext(fields) }),
  };
}

function emit({
  logger,
  level,
  event,
  fields,
}: {
  logger: LogLayer;
  level: "debug" | "info" | "warn" | "error";
  event: SituLogEvent;
  fields?: LogFields;
}): void {
  const { error, metadata } = splitError({ fields });
  const builder = Object.keys(metadata).length > 0 ? logger.withMetadata(metadata) : logger;
  const entry = error === undefined ? builder : builder.withError(error);
  entry[level](event);
}

function splitError({ fields }: { fields?: LogFields }): {
  error: unknown;
  metadata: LogFields;
} {
  if (!fields) {
    return { error: undefined, metadata: {} };
  }
  const { error, ...metadata } = fields;
  return { error, metadata };
}
