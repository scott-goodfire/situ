---
name: situ-policy-replicache-pull-membership
description: Use whenever adding, modifying, or reviewing a table that should sync to the web client — new entity tables, activity tables, or changes to http/replicache.ts buildReplicachePatch.
---

# Replicache Pull Membership

Every table the web app needs to see appears explicitly in the
Replicache sync membership list. Sync membership is a deliberate
decision, not a side effect of having a table.

## Why

A new entity table with `syncTracking()` columns is _capable_ of
syncing, but won't actually reach the web client until it's wired into
`buildReplicachePatch`. Forgetting that step is a silent bug: the row
exists in SQLite, the API works, the UI shows nothing. Making
membership explicit means the wiring is part of "adding a table",
not a follow-up.

## Rules

- One file per synced data model lives under
  `projects/app/src/routes/replicache-sync/`.
- `projects/app/src/routes/replicache-sync/index.ts` is the explicit
  membership list. Adding or removing a synced model means changing that
  file.
- For each table that should sync, its data-model sync file runs:

  ```ts
  db
    .select()
    .from(<table>)
    .where(gt(<table>.syncVersion, sinceVersion))
    .orderBy(asc(<table>.createdAt), asc(<table>.id))
  ```

  and adds the rows to the patch under a stable key prefix
  (`researchTasks/`, `hypotheses/activities/`, etc.).

- `projects/app/src/routes/replicache-pull.ts` owns pull orchestration,
  cookie/version handling, reset behavior, and the singleton `status`
  patch. It should not contain per-table query/mapping logic.
- `projects/app/src/routes/replicache.ts` owns only the Hono route
  handlers for `/replicache/poke` and `/replicache/pull`.
- Activity / event rows fan out under `<entity>/activities/` or
  `<entity>/events/` keys so the web app can scope by parent record.
- Tables that should NOT sync (system tables like `sync_state`,
  `replicache_clients`) are listed in a comment near the pull
  orchestration so reviewers know the omission is intentional.
- Selectors in `projects/web/src/hooks/<entity>.ts` use the same
  key prefix the patch uses (see `situ-policy-hook-shape`).

## Avoid

- Adding a table with `syncTracking()` and forgetting to wire it into
  `replicache-sync/index.ts` — UI never sees it.
- Filtering rows inside the patch builder by anything other than
  `syncVersion > sinceVersion`. Domain filtering belongs in the
  selector or the page.
- Pulling a `syncDeleted=true` row without a `del` patch operation
  (Replicache will keep stale state in the client).
- Two tables sharing the same key prefix.
- Reintroducing one large all-table pull file. Keep data-model sync files
  small and boring, even if Fallow sees structural duplication.

## See also

- `situ-policy-standard-schema-columns`
- `situ-policy-mutations-via-runsyncedwrite`
- `situ-policy-hook-shape`
- `situ-policy-protocol-record-types`
