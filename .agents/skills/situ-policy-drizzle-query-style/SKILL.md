---
name: situ-policy-drizzle-query-style
description: Use whenever writing, modifying, or reviewing drizzle queries — repository reads, repository writes, work-item claims, or any DB call in projects/app/src.
---

# Drizzle Query Style

Drizzle is the only DB layer; queries use the query builder.

## Rules

- Reads: `db.query.<table>.findFirst({ where })` / `findMany({ ... })`,
  or `db.select().from(<table>).where(...).orderBy(...)`.
- Writes: chain `.run()` —
  `db.insert(table).values({...}).run()`,
  `db.update(table).set({...}).where(...).run()`.
- Filters use drizzle operators (`eq`, `and`, `or`, `inArray`, `asc`, `desc`) from `drizzle-orm`.
- Read `db` from `getDb()`. Write `db` comes from the `runSyncedWrite` callback.

## Exceptions

- Raw `` sql`...` `` is allowed for column-relative arithmetic in
  `update().set({...})` (e.g., `` sql`${workItems.attempt} + 1` ``,
  `` sql`${syncState.version} + 1` ``).
- Migration scripts in `db/migrate.ts` may use raw SQL freely.
- DDL in `db/schema.ts` (column defaults, partial indexes) is out of scope of this policy.

## Avoid

- `.execute()` anywhere in src.
- `db.run(...)` with raw `` sql`...` `` for a query the builder can express.
- A `where` clause written as `` sql`...` `` instead of `eq` / `and` / `or` / `inArray`.
- A `findFirst` / `findMany` followed by ad-hoc JS filtering the `where` should have done.

## See also

- `situ-policy-mutations-via-runsyncedwrite`
- `situ-policy-json-columns`
