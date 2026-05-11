---
name: situ-policy-db-migration-shape
description: Use whenever adding, modifying, or reviewing a SQLite schema change — new tables, dropped tables, column additions, or any edit to projects/app/src/data/db/migrate.ts.
---

# DB Migration Shape

Schema changes land in `projects/app/src/data/db/migrate.ts` as compact,
current-shape SQL. The runner creates the schema expected by the current
codebase; it does not carry upgrade shims for old local database shapes.

## Why

The local app runs on per-session SQLite files, and clarity matters more
than preserving every historical local schema. Keeping `migrate.ts` as
the compact source of the current schema makes boot behavior easier to
reason about and avoids stale compatibility code outliving the tables
and columns it was written for.

## Rules

- All schema lives in `projects/app/src/data/db/migrate.ts`. The `migrate()`
  function is the only entry point.
- New tables go into the `SCHEMA_SQL` template using
  `CREATE TABLE IF NOT EXISTS <name> ( ... );`. Use the existing
  `${TIMESTAMPS}`, `${SYNC_COLUMNS}`, `${PAYLOAD_JSON}`, `${CREATED_AT}`
  template constants for shared columns.
- Column additions go directly into the relevant `CREATE TABLE` statement
  in `SCHEMA_SQL` and the matching table in `db/schema.ts`.
- Removed tables are removed from `SCHEMA_SQL` and `db/schema.ts`; do not
  add compatibility `DROP TABLE` cleanup for historical local DBs.
- If a local DB predates the current compact schema, recreate that local
  DB instead of teaching `migrate.ts` how to upgrade it.
- The drizzle schema in `db/schema.ts` and the SQL in `migrate.ts`
  define the same shape. After editing `migrate.ts`, mirror the change
  in `schema.ts` (or the reverse).
- Run `mise run db:generate` after schema changes — drizzle-kit emits
  reference SQL into `projects/app/drizzle/migrations/` for inspection,
  even though the runtime path is `migrate.ts`.

## Avoid

- A `CREATE TABLE` without `IF NOT EXISTS`.
- A `COMPATIBILITY_ALTERATIONS` array, duplicate-column swallowing, or
  other historical upgrade shim in the runtime runner.
- A `DROP_REMOVED_TABLES_SQL` block for old local tables. Remove the table
  from the current schema instead.
- Dropping a column with `ALTER TABLE DROP COLUMN`. Remove it from the
  compact current schema only when the code no longer reads or writes it.
- A schema change that lands in `db/schema.ts` but not `migrate.ts` —
  the app crashes at boot when the column is missing.
- Inline `INSERT` seed data that isn't idempotent
  (`INSERT OR IGNORE` is fine).

## See also

- `situ-policy-mutations-via-runsyncedwrite`
- `situ-policy-drizzle-query-style`
- `situ-policy-file-size-and-slice-plan`
