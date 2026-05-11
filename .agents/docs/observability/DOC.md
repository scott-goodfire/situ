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

## Reading the Session DB

Per-session state lives at `~/.situ/sessions/<id>/session.sqlite` (watch mode
exports the path as `dbPath`). Read-only `sqlite3` and `bun:sqlite` queries
are the supported way to inspect it; see `live-eval-observation` for
end-to-end recipes.

Every timestamp column (`created_at`, `updated_at`, `available_at`,
`claimed_at`, `lease_expires_at`, `started_at`, `completed_at`,
`resolved_at`, `closed_at`, `last_event_at`) is `TEXT`. Values are ISO date
strings, never unix milliseconds. Numeric comparisons like
`updated_at > 1715000000000` silently match nothing.

Two ISO formats can appear in the same column depending on the write path:

- SQLite's `CURRENT_TIMESTAMP` default: `2026-05-11 17:11:08` — space
  separator, second precision, no `Z`.
- App writes via `dateTimeModule.nowIso()` (Luxon): `2026-05-11T17:11:08.789Z`
  — `T` separator, millisecond precision, explicit `Z`.

Both are valid ISO 8601. SQLite's `datetime()` parses each form and returns
the canonical `YYYY-MM-DD HH:MM:SS` shape, so windowing and ordering are
uniform when you wrap the column:

```sql
SELECT id, status, datetime(updated_at) AS updated
  FROM claude_agent_runs
 WHERE datetime(updated_at) > datetime('now', '-15 minutes')
 ORDER BY datetime(updated_at) DESC;
```

Ad-hoc CSV export uses the `sqlite3` CLI; there is no built-in export
endpoint. The exported columns stay as their stored strings:

```bash
sqlite3 -csv -header ~/.situ/sessions/<id>/session.sqlite \
  "SELECT id, status, created_at, updated_at
     FROM claude_agent_runs
    WHERE datetime(updated_at) > datetime('now', '-1 hour')
    ORDER BY datetime(updated_at) DESC" > runs.csv
```

Downstream consumers (pandas, spreadsheets) must treat the timestamp columns
as ISO 8601 strings and parse them as such — not as epochs.

## Tool Error Codes Are Durable Fields

All 69 custom tools return a result envelope. Failures arrive as
`{ ok: false, code: "no_candidate_commit", hint: "...", details: {...} }`
and are persisted on Claude tool-result events. They land in
`claude_agent_events.payload_json` and remain queryable long after
the run finishes.

Treat `code` as a stable observable field, not just a log string.
OTel attribute filters, SQLite analytics over a session DB, and
historical aggregation across runs can all key on it without
parsing free-form prose. When you add a new failure code on a
tool, you are extending the observable surface area — pick a name
that will still make sense to a future verifier or operator
inspecting an event timeline.

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
