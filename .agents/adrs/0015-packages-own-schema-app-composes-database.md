---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0015. Packages Own Schema, App Composes Database

## Context

Package authors need to reason about the tables for their primitive without
opening one giant schema file. The app still needs one coherent SQLite database,
ordered migrations, sync state, and transaction boundaries.

## Decision

Domain packages own table declarations for the records they own.

The app database layer owns:

- full schema composition
- migrations
- SQLite client creation
- sync-state tables
- Replicache client state
- transaction helpers

```text
@situ/tasks/src/schema.ts
  tasks, task_labels, task_label_assignments

@situ/app/src/db/schema.ts
  imports all package tables and exports the full schema
```

## Consequences

Packages remain understandable in isolation.

The app can enforce cross-package integrity through the composed schema without
creating package import cycles.

System tables such as `sync_state` and `replicache_clients` belong to the app
database layer, not primitive packages.

## Related

- ADR 0014: Split Backend Into Primitive Packages
- ADR 0017: Define Common Package Contract
