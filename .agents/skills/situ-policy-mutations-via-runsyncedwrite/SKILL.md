---
name: situ-policy-mutations-via-runsyncedwrite
description: Use whenever writing, modifying, or reviewing DB mutations in projects/app/src — inserts, updates, deletes, status transitions, or any state change that should reach connected clients.
---

# Mutations via runSyncedWrite

Every mutation runs inside `runSyncedWrite` so `syncVersion` increments and replicache pokes fire.

## Why

`syncVersion` increments drive the replicache poke that updates connected web clients. A mutation that bypasses `runSyncedWrite` writes durable state but leaves the UI stale — users won't see the change without a refresh. Multi-step writes inside one `runSyncedWrite` share a transaction; split them and you can persist half the work.

## Rules

- Mutating code wraps in `runSyncedWrite({ write: ({ db, syncVersion }) => ... })` from `db/sync.ts`.
- Multi-step writes (insert entity + insert activity) happen inside ONE
  `runSyncedWrite` so they share a transaction and a single `syncVersion`.
- Use the transactional `db` from the callback. Never call `getDb()` for
  writes inside the block.
- `notify: false` is reserved for setup paths (e.g., bulk seeding).
  Production mutations leave the default `true`.
- Status transitions go through `situ-policy-status-record-transitions`,
  which itself wraps `runSyncedWrite`. Don't double-wrap.

## Exceptions

- Naked `db.update`, `db.insert`, `db.delete` outside `runSyncedWrite` are
  allowed only in `db/migrate.ts` and migration SQL.

## Avoid

- `getDb().insert(...)` / `getDb().update(...)` directly.
- An async mutation with one write inside `runSyncedWrite` and a follow-up
  write outside it — splits the transaction.
- Calling `notifySyncChanged` manually after a mutation.

## See also

- `situ-policy-durable-records`
- `situ-policy-status-record-transitions`
- `situ-policy-drizzle-query-style`
