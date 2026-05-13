---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0006. Use Bun, Hono, SQLite, Drizzle, And Replicache

## Context

The app is local-first and repository-centered. It needs a small HTTP API, local
durable state, browser sync, and command/runtime integration. The stack should
stay boring and easy to reason about.

## Decision

The backend stack is:

- Bun for runtime and CLI execution
- Hono for HTTP routing
- SQLite for local durable state
- Drizzle or a similarly direct typed query layer for schema and migrations
- Replicache-compatible push/pull sync for the web app

## Consequences

The app should not introduce a distributed service architecture, remote
database, or queueing platform by default.

All durable product records should fit in local SQLite.

HTTP routes should stay small. Most user-visible writes should flow through
Replicache push mutations or the same app actions used by push mutations.

The stack choice should be made before package-level ADRs so implementers know
what APIs and constraints to assume.

## Related

- ADR 0001: Build A Local Autoresearch App
- Architecture: `.agents/docs/architecture/DOC.md`
