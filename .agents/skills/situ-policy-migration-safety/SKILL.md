---
name: situ-policy-migration-safety
description: Use whenever generating, reviewing, or running database migrations — drizzle-kit invocations, schema changes in projects/app/src/data/db, or any edit to migrate.ts.
---

# Migration Safety

Schema changes go through two layers of mechanical checks: **drizzle-kit
check** (consistency among generated migration files) and the existing
runtime path (`db/migrate.ts` with compact current-schema SQL). A third
layer — **Atlas migrate lint** — is staged but inactive until we adopt
versioned migration files in earnest.

## Why

Local SQLite should be easy to recreate, and the runtime schema should be
easy to inspect. `migrate.ts` is intentionally the current schema, not a
timeline of historical upgrades. A `DROP COLUMN` written into
`drizzle/migrations/` would never reach the runtime today (we run our own
SQL), but it **would** ship the moment we wire drizzle-kit's runner.
Catching destructive ops before they sit in the repo is cheaper than
catching them at deploy.

## Rules

- After any edit to `db/schema.ts` or `db/migrate.ts`, run
  `bun --filter=@situ/app run db:generate` and verify the generated
  file in `projects/app/drizzle/migrations/` matches the runtime
  intent.
- Before merging a migration-touching PR: `mise run drizzle:check`
  (drizzle-kit's consistency validator over `drizzle/migrations/`).
- The runtime entry point is `projects/app/src/data/db/migrate.ts`. SQL in
  there must represent the compact current schema — see
  `situ-policy-db-migration-shape` and `situ-policy-standard-schema-columns`
  for the column-set rules.
- New columns go into both:
  - `db/schema.ts` (drizzle types — what TypeScript sees)
  - `db/migrate.ts` (runtime SQL — what SQLite sees)
    Drift between the two is the single biggest source of migration
    bugs at our scale.
- Do not add runtime upgrade shims for historical local DBs. If a local DB
  predates the compact schema, recreate it instead.

## Atlas (deferred)

`atlas migrate lint` flags destructive ops (locking ALTERs, DROP
COLUMN on existing data, NOT NULL on existing rows). Atlas requires a
populated `drizzle/migrations/` directory to lint — today that
directory is empty (the runtime path is `db/migrate.ts`, not
versioned files).

Wire Atlas when **either** of these becomes true:

- `drizzle/migrations/` accumulates 3+ generated migrations that we
  intend to run via drizzle-kit's runner.
- A migration on a hot table (research_tasks, work_items, claudeAgents,
  hypotheses) lands without obvious destructive-op review.

Until then, the runtime's compact current-schema SQL is the gate.

## Avoid

- A schema change in `db/schema.ts` without the matching SQL in
  `db/migrate.ts` (or vice versa) — drift surfaces at boot.
- A `DROP COLUMN` in any migration. SQLite supports it; our runner
  doesn't gate it. Remove columns from the compact schema only after the
  code no longer reads or writes them.
- A new migration file (when we adopt them) that hasn't passed
  `mise run drizzle:check`.
- Running `drizzle-kit drop` to recover from drift. Drift is fixed at
  the source by syncing schema and migrate.ts.

## See also

- `situ-policy-db-migration-shape`
- `situ-policy-standard-schema-columns`
- `situ-policy-mutations-via-runsyncedwrite`
- `situ-policy-drizzle-query-style`
