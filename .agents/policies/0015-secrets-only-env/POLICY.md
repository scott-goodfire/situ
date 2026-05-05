---
title: Secrets Only Environment
status: active
---

# Policy: Secrets Only Environment

## Applies To

Runtime config, AI eval config, observability setup, DBOS setup, CLI docs, local
smoke commands, and any user-facing environment variable.

## Rule

User-facing environment variables should be secrets only.

Use `pydantic-settings` for secret loading and validation. Keep non-secret
defaults in typed code config, and keep session/project inputs in CLI arguments,
stored project config, or durable records.

The current user-facing secret env vars are:

```text
SITU_LOGFIRE_TOKEN
SITU_OPENAI_KEY
```

Provider-native SDK env vars like `LOGFIRE_TOKEN` and `OPENAI_API_KEY` may be
set internally immediately before calling SDKs, but docs and examples should
prefer Situ-scoped names.

## Required Checks

- Do not add a user-facing env var for a model name, service name, timeout,
  DBOS database URL, local state home, Logfire send mode, or environment name
  without a clear product reason.
- Put stable non-secret defaults in typed config classes.
- Put secrets in `BaseSettings` classes with Situ-scoped names.
- Keep `.env.example` limited to user-facing secrets.
- Keep tests isolated through constructor parameters, temporary paths, or
  fixtures rather than user env overrides.
- Treat process handoff env vars between CLI, TUI, session server, and workers
  as internal implementation details; do not document them as user config.
- When introducing a new SDK that requires a provider env var, map from an
  Situ-scoped secret at the integration boundary.

## Red Flags

- A README asks users to set both `SITU_*` and provider-native env vars for
  the same secret.
- A non-secret default is configurable only through an environment variable.
- A deterministic test depends on shell environment state.
- An eval silently uses `OPENAI_API_KEY` when `SITU_OPENAI_KEY` is missing.
- Operational knobs creep into `.env.example` before the product has a real
  configuration story for them.
