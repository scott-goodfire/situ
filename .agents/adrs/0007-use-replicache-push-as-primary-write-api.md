---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0007. Use Replicache Push As Primary Write API

## Context

The web app needs local-first reads and writes. A large REST surface would split
the write model across endpoints, CLI commands, scheduler actions, and agent
tools.

## Decision

Most normal product writes will enter through Replicache `push` mutations.

The public HTTP API should stay small:

```text
GET    /api/status
POST   /api/replicache/pull
POST   /api/replicache/push
GET    /api/events
```

Non-Replicache endpoints exist only for operations that are not normal synced
record mutations, such as status checks, event streaming, local secret setup,
artifact downloads, or Managed Agents callbacks.

## Consequences

Mutation names should map to primitive user-visible actions such as
`task/assign`, `comment/create`, `experiment/create`, and `review/create`.

Push handlers must validate, apply app actions, record events/comments when
appropriate, and bump sync state.

Agent tools and CLI commands should not invent parallel write paths. They call
the same app actions used by Replicache mutations.

## Related

- ADR 0006: Use Bun, Hono, SQLite, Drizzle, And Replicache
- ADR 0010: Use App Actions As Shared Write Boundary
