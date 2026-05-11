# Observability

Situ uses standard libraries for diagnostics and tracing while keeping durable
product evidence in SQLite.

## Stack

Runtime code imports the local `logModule` API and tracing helpers. The underlying
libraries are:

- LogLayer for the app-facing logging facade
- Pino for log transport and formatting
- LogLayer redaction and OpenTelemetry plugins for redaction and trace context
- OpenTelemetry JS for traces
- `@hono/otel` and `@loglayer/hono` for request spans and request-scoped logs

App code should not import Pino, LogLayer transports, or OpenTelemetry SDK
setup directly. Those details live under `projects/app/src/observability`.

## Surfaces

Logs are transient diagnostics. Use `logModule.debug`, `logModule.info`,
`logModule.warn`, and `logModule.error` with a stable event name from `obs.log` for things a developer
might need while the process is running.

Spans are timing and correlation. Use `withSpan` with a stable span name from
`obs.span` around scheduler jobs, work-item handlers, Claude turns, custom
tools, and other multi-step runtime operations.

Attributes are stable search fields. Use keys from `obs.attr` for entity IDs,
statuses, roles, counters, and other small values.

Durable state is product truth. Use domain tables, activities, Claude events,
and `app_events` for data that must survive process exit and sync to the UI.

## Configuration

Logging:

```text
SITU_LOG_LEVEL=debug|info|warn|error
```

Log output format is automatic: human-readable when stderr is a TTY and JSON
when stderr is piped or captured.

Tracing:

```text
SITU_OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

Tracing is off when the OTLP endpoint is absent. When the endpoint is present,
Situ exports app spans through the standard OTLP HTTP exporter. The service
name is fixed to `situ`.

## Eval Watch

`mise run evals -- --watch` belongs to the eval harness. It prints the temp
world metadata and keeps the temp world for inspection. It does not replace
logging or tracing.

When watching live agent evals, combine:

- `mise run evals -- --watch` for `dbPath` and workspace metadata
- local SQLite reads for durable state
- Claude Managed Agents session/event reads for remote state
- `SITU_OTEL_EXPORTER_OTLP_ENDPOINT` when an external trace viewer is available

## Call-Site Pattern

Feature code should stay small:

```ts
import { logModule } from "../modules/log";
import { obs, withSpan } from "../observability";

await withSpan({
  name: obs.span.workItem.handle,
  attributes: { [obs.attr.workItem.id]: workItem.id },
  fn: async () => {
    await handler({ workItem });
  },
});
```

Do not pass secrets to log metadata or span attributes. The logger has
redaction, but redaction is a guardrail, not permission to log keys.
