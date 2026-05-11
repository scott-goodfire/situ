---
name: situ-policy-standard-schema-columns
description: Use whenever adding, modifying, or reviewing a SQLite table — new entity tables, activity tables, junction tables, or any change to projects/app/src/data/db/schema.ts and migrate.ts.
---

# Standard Schema Columns

Every table includes the right shared column set via the existing
helpers. Hand-rolling timestamps or sync columns is banned.

## Why

`syncVersion` and `syncDeleted` drive Replicache; missing them means
the table never reaches the web client. `created_at` and `updated_at`
let activities sort and let migrations reason about staleness. Using
the helpers means a new table either inherits these correctly or
explicitly opts out — there's no quiet middle ground.

## Rules

- **Drizzle schema** (`db/schema.ts`) uses these helpers from the top of
  the file:
  - `timestamps()` — `createdAt` + `updatedAt`
  - `createdAtOnly()` — `createdAt` (for activity / event tables)
  - `syncTracking()` — `syncVersion` + `syncDeleted`
  - `payloadJson()` — `payloadJson` text column with `'{}'` default
- **Migration SQL** (`db/migrate.ts`) uses the matching template
  constants: `${TIMESTAMPS}`, `${CREATED_AT}`, `${SYNC_COLUMNS}`,
  `${PAYLOAD_JSON}`.
- **Entity tables** (rows representing user, agent, or research state):
  include `id text primary key`, `...syncTracking()`, `...timestamps()`,
  plus `payloadJson()` if the row carries free-form data.
- **Activity / event tables** (`*_activities`, `*_events`): include
  `id`, `...syncTracking()`, `...createdAtOnly()`. No `updatedAt`
  because activity rows are immutable.
- **Junction tables** (many-to-many link tables): include
  `...syncTracking()` + `...createdAtOnly()`, with composite primary
  keys. Prefer direct foreign keys for one-primary relationships, such
  as an Experiment's primary hypothesis.
- **System tables** (`sync_state`, `replicache_clients`,
  `local_settings`) may include `timestamps()` only or none — these
  are documented exceptions.

## Avoid

- A new entity table with hand-rolled `created_at` / `updated_at` /
  `sync_version` instead of the helpers.
- An entity table without `syncTracking()` — it'll never reach the web
  client (see `situ-policy-replicache-pull-membership`).
- An activity table that adds `updatedAt`.
- Schema and migrate.ts disagreeing on which columns a table has.

## See also

- `situ-policy-db-migration-shape`
- `situ-policy-replicache-pull-membership`
- `situ-policy-mutations-via-runsyncedwrite`
- `situ-policy-protocol-record-types`
