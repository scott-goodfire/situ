---
name: situ-policy-observability
description: Use whenever adding, modifying, or reviewing logging, tracing, Hono observability middleware, or SITU_OTEL_* configuration in projects/app/src.
---

# Observability

`projects/app/src/observability` owns logging and tracing integration.

## Why

Feature code should not care which logger, trace exporter, or Hono middleware is
installed. The app imports small local helpers while LogLayer, Pino, and
OpenTelemetry stay centralized.

## Rules

- Runtime logs go through `logModule` from `projects/app/src/modules/log`.
- Runtime spans go through `withSpan` or `tracer` from
  `projects/app/src/observability`.
- Runtime observability names come from `obs` in
  `projects/app/src/observability/names.ts`. Do not invent dotted string names
  at call sites.
- Hono request logging/tracing is installed once in `server.ts` through
  `installObservabilityMiddleware`.
- `SITU_LOG_*` and `SITU_OTEL_*` reads live under `projects/app/src/config`.
- Use span attributes for stable IDs, statuses, and entity kinds; do not put
  large payloads, prompts, or secrets in attributes.
- Durable product evidence still goes to tables, activities, Claude events, and
  `app_events`; traces and logs are diagnostic.

## Avoid

- Direct `pino`, `LogLayer`, OpenTelemetry SDK, or Hono observability imports
  from feature modules.
- A feature module creating its own logger, trace provider, exporter, or
  request middleware.
- Mode selectors, output-format flags, or per-feature observability settings.
- Logging Anthropic keys, authorization headers, cookies, or raw prompt payloads.
- Treating live agent eval watch mode as a tracing system; it is only an eval
  harness inspection option.

## See also

- `situ-policy-logging`
- `situ-policy-configuration-env-vars`
- `.agents/docs/observability/DOC.md`
