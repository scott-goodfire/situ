---
name: situ-policy-logging
description: Use whenever emitting diagnostic output, swallowing a caught error, or adding observability to non-CLI code paths in projects/app/src — anything that's not user-facing CLI output.
---

# Logging

Diagnostic output goes through `logModule` in `modules/log`, backed by
LogLayer and Pino under `observability/`. Direct `console.*` is reserved for
CLI user-facing output (governed by `situ-policy-cli-command-shape`).

```ts
import { logModule } from "../modules/log";
import { obs } from "../observability";

logModule.error(obs.log.scheduler.jobFailed, { [obs.attr.scheduler.job]: name, error });
logModule.error(obs.log.sync.pokeListenerFailed, { error });
```

## Why

Two problems we're solving at once:

1. **CLI output stays clean.** `console.log` writes to stdout; piping
   `situ status --json` into another tool means stdout must be the
   structured payload, not interleaved log lines. The logger writes to
   stderr.
2. **Caught errors don't disappear.** `} catch (error) { console.error(error); }`
   prints something to stderr but with no level, no timestamp, no
   structured fields — and there's no way to silence it in tests or
   surface it in JSON for tooling. The logger normalizes all four.

## Rules

- Diagnostic output uses `logModule.debug` / `logModule.info` /
  `logModule.warn` / `logModule.error` from `modules/log`. Direct
  `console.*` is reserved for the
  user-facing CLI surface and script entry points: `cli/`, `cli.ts`,
  `diagnostics/doctor.ts`, `db/migrate.ts`, `web/build.ts`, plus
  `printHelp`-style help-text functions wherever they live (e.g.,
  `config/runtime.ts:printHelp`).
- Use stable event names from `obs.log` and structured fields, not interpolated
  strings:

  ```ts
  // Good
  logModule.warn(obs.log.workItem.leaseExtensionFailed, {
    [obs.attr.workItem.id]: workItemId,
    attempt,
  });

  // Avoid
  logModule.warn(`lease extension failed for ${workItemId}`);
  ```

- Errors go in the `error` field — the logger unwraps `Error` instances
  to `{ message, name }`:

  ```ts
  logModule.error(obs.log.scheduler.jobFailed, {
    [obs.attr.scheduler.job]: name,
    error,
  });
  ```

- Levels:
  - `debug` — verbose tracing, off by default
  - `info` — normal life-of-app events (scheduler ticks, agent runs,
    work-item transitions)
  - `warn` — unexpected but recoverable
  - `error` — swallowed errors; failures the app keeps running through
- The app-facing import stays local:
  `import { logModule } from "../modules/log";`. Feature code does not import
  Pino, LogLayer, transports, plugins, or OpenTelemetry SDK setup directly.
- Configuration lives in `config/log.ts`:
  - `SITU_LOG_LEVEL=debug|info|warn|error` (default `info`)
- Log output is automatic: human-readable on a TTY, JSON when stderr is piped
  or captured.
- Trace correlation is automatic when an OpenTelemetry span is active. Do not
  manually add trace IDs to log fields.
- App events (durable, persisted to `app_events`) and logs (transient
  diagnostics) are different surfaces. Persistent observability goes to
  `recordAppEvent` (see `situ-policy-durable-records`); ephemeral
  diagnostics go to `logModule`.

## Avoid

- `console.log` / `console.error` outside the user-facing CLI surface.
- A `try { ... } catch (error) { console.error(error); }` block —
  swallow with `logModule.error(obs.log.sync.pokeListenerFailed, { error })` so the
  line has level and context.
- Logging secrets. The logger has redaction guardrails, but callers are
  responsible for never passing an Anthropic key, session cookie, etc. into
  fields.
- `logModule.info` (or worse, `console.log`) for every iteration of a hot
  loop — use `logModule.debug` and let `SITU_LOG_LEVEL` gate it.
- Treating logs as durable evidence of agent work — that's
  `app_events`, not the logger.
- Inventing one-off log event strings at call sites instead of adding a name to
  `obs.log`.

## See also

- `situ-policy-cli-command-shape`
- `situ-policy-observability`
- `situ-policy-error-throwing`
- `situ-policy-durable-records`
- `situ-policy-configuration-env-vars`
