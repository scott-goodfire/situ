---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0018. Use Replicache Push As Primary Write API

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

Push mutations use a small envelope:

```text
clientId
mutationId
name
args
```

The push handler applies each mutation idempotently per client. Pull responses
are composed from registered package serializers and a shared sync version.
UI-visible tables use `syncVersion` and `syncDeleted` so deletes can sync as
tombstones.

## Consequences

Mutation names should map to primitive user-visible actions such as
`task/assign`, `comment/create`, `experiment/create`, and `review/create`.
Mutations should not accept raw table patches.

Push handlers must validate, apply app actions, record events/comments when
appropriate, and bump sync state.

Mutations in one push are processed in order. Each mutation maps to one app
action and receives a stable success or failure result. App actions decide the
transaction boundary; package repositories do not directly handle Replicache
protocol concerns.

Agent tools and CLI commands should not invent parallel write paths. They call
the same app actions used by Replicache mutations.

Package serializers own key prefixes such as `tasks/<id>`,
`notifications/<id>`, and `experiments/<id>`. The app sync route explicitly
registers package serializers; a table does not sync merely because it exists.

## Related

- ADR 0006: Use Bun, Hono, SQLite, Drizzle, And Replicache
- ADR 0021: Use App Actions As Shared Write Boundary
