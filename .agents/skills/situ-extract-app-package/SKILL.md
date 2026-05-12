---
name: situ-extract-app-package
description: Use whenever extracting a self-contained domain from @situ/app into its own workspace package under projects/app/packages, planning a "package-ify" cutover, or reviewing an in-progress package extraction.
---

# Situ Extract App Package

A workflow for hard-cutover extractions of a domain from `projects/app/src/`
into its own `@situ/<domain>` package at `projects/app/packages/<domain>/`.
The worked reference is `@situ/compute` — read its policy skill and source
before starting.

## When This Fits

Good extraction candidates:

- Own one table or a tight cluster that no other domain writes
- A small set of well-bounded operations (claim/release, create/transition,
  search/list, …) accessed through a repository + a handful of helpers
- Used by a countable number of call sites (~10–30), not threaded through
  every Claude tool
- Cross-domain orchestration around the domain is _separable_ (e.g., compute
  lease recovery touches research-tasks and work-items, but it can stay in
  the app and import from `@situ/compute`)

Signals to defer:

- The handler/operation directly executes Claude agent turns or registers
  side-effects from many app modules (work-items has this shape today)
- Touches many tables across unrelated domains in a single transaction
- Mostly cross-cutting wiring (observability, secrets) — the cost of DI
  setup outweighs the gain

## Before Editing

Read the worked example and current state:

```bash
sed -n '1,200p' .agents/skills/situ-policy-compute-package/SKILL.md
find projects/app/packages/compute/src -type f | sort
sed -n '1,200p' projects/app/packages/compute/src/index.ts
sed -n '1,200p' projects/app/packages/compute/src/module.ts
sed -n '1,200p' projects/app/packages/compute/src/context.ts
sed -n '1,200p' projects/app/src/data/db/configure-compute-package.ts
```

Survey the domain you're moving:

```bash
find projects/app/src/runtime/<domain> projects/app/src/data/repositories/<domain> -type f 2>/dev/null | sort
grep -n "<domain>Repository\|<DomainTable>\|<DomainConstant>" projects/app/src/data/db/schema.ts
grep -n "<domain>" projects/app/src/data/db/migrate.ts
grep -rn "from \"\.\./.*<domain>\|<domainModule>\|<domainOperation>" projects/app/src | sort
```

## Package Shape

Mirror `@situ/compute`:

```text
projects/app/packages/<domain>/
├── package.json       # single barrel, "@situ/<domain>"
├── tsconfig.json      # composite, extends ../../../../tsconfig.base.json
├── README.md          # what's here / what's NOT here
└── src/
    ├── index.ts       # public barrel
    ├── module.ts      # <domain>Module namespace
    ├── schema.ts      # drizzle table(s) + <DOMAIN>_TABLE_SQL string
    ├── constants.ts
    ├── types.ts       # exports + ComputeContext-style ctx type
    ├── context.ts     # configure<Domain> / get<Domain>Context
    ├── __shared__/    # internal helpers (PreconditionError, parseRecord, nowIso, …)
    ├── repository/
    ├── operations/    # one operation per file
    └── <pure-helpers>/ # e.g., blockers — pure analyzers only
```

Hard rules:

- `package.json` exports a single barrel: `"exports": { ".": "./src/index.ts" }`.
  No sub-path exports.
- Operations expose a namespace object `<domain>Module` (matching `jsonModule`,
  `textModule`). Drop the domain prefix from operation names — the namespace
  already names the domain.
- Module-level DI through `configure<Domain>({ getDb, runSyncedWrite,
recordAppEvent, … })`. **`getDb` is a thunk**, not a stored db reference,
  so tests that `resetDbForTests()` then re-`ensureRuntimeContext()` pick up
  the new db without rewiring.
- Cross-package shapes use _structural types_ (`xxxLike = { id; payloadJson }`)
  to avoid importing app drizzle row types.
- Internal `__shared__/` may duplicate tiny app helpers (`parseRecord`,
  `nowIso`, `PreconditionError`) rather than depend on `@situ/app/modules/*`.
  Keep the package's static dep graph free of app symbols.
- Cross-domain orchestration (recovery loops, blocker readers that join
  other tables) **stays in the app**. The package owns its focused domain;
  the app composes domains.

## Extraction Order

Hard cutover, one PR. Tree may be red mid-flight, green at the end.

1. Add `projects/app/packages/*` to root `package.json` workspaces (only if
   no prior package created it).
2. Create skeleton: `package.json`, `tsconfig.json`, `README.md`,
   `src/index.ts` (initially listing planned exports).
3. Move `schema.ts` — drizzle table + `<DOMAIN>_TABLE_SQL` string for the
   runtime migrator. Drop drizzle `.references(() => otherTable.id)` for any
   FK that points outside the package — the SQL keeps the FK at the SQLite
   level.
4. Move `constants.ts` and `types.ts`.
5. Add `__shared__/` helpers.
6. Add `context.ts` with `configure<Domain>` / `get<Domain>Context` /
   `resetComputeContextForTests`.
7. Move repository. Convert `db.query.<table>.findFirst({ where: … })` to
   `.select().from(<table>).where(…).limit(1)` so the loose db type
   (`BunSQLiteDatabase<Record<string, unknown>>`) is enough.
8. Split operations into focused files under `operations/`. One per file.
9. Move pure analyzers into their own folder (e.g., `blockers/`); keep any
   db-reader wrapper in the app.
10. Build `module.ts` namespace and finalize `src/index.ts` barrel.
11. Move pure unit tests into the package. Integration tests that need the
    full app runtime stay in the app.
12. Relocate cross-domain orchestration to `projects/app/src/runtime/<domain>/`
    (or a sibling top-level folder); update its imports to use
    `@situ/<domain>`.
13. Add `"@situ/<domain>": "workspace:*"` to `projects/app/package.json`.
14. Wire `configure<Domain>` from `ensureRuntimeContext` via **dynamic
    import**:

    ```ts
    // projects/app/src/config/session-context.ts
    const { configure<Domain>Package } = await import("../data/db/configure-<domain>-package");
    configure<Domain>Package();
    ```

    The wiring file imports `getDb` from `./client` plus `runSyncedWrite`
    and `recordAppEvent`. A static import from `client.ts` would form a
    cycle (`client → app-events → sync → client`); the dynamic import keeps
    the static graph acyclic.

15. Update app's `data/db/schema.ts` to re-export the moved table:
    `export { <table> } from "@situ/<domain>";`
16. Update app's `data/db/migrate.ts` to interpolate `<DOMAIN>_TABLE_SQL`
    and remove the inline CREATE TABLE + indexes for that table.
17. Update every call site to `@situ/<domain>`. Sweep with grep first.
18. Delete the old `projects/app/src/runtime/<domain>/` and
    `projects/app/src/data/repositories/<domain>/` folders.
19. Update the matching `test:<domain>` script in
    `projects/app/package.json` if the test files moved.
20. Wire two new steps into `scripts/check.sh`:

    ```bash
    run_check_step "typecheck: @situ/<domain>" bun --filter=@situ/<domain> run check
    run_check_step "test: @situ/<domain>" bun --filter=@situ/<domain> run test
    ```

21. Add `.agents/skills/situ-policy-<domain>-package/SKILL.md` capturing
    the package's specific rules (mirror `situ-policy-compute-package`).
22. `bun install` and run validation.

## Pitfalls

- **Import cycle from `client.ts`.** Do not import the wiring helper from
  `data/db/client.ts`. Use the dynamic import from `ensureRuntimeContext`
  per step 14.
- **Stored db reference.** Configure with `getDb` (a thunk), not
  `configure<Domain>({ db: getDb(), ... })`. Tests reset the db; a stored
  reference goes stale.
- **Sub-path exports.** Single barrel only. Don't add `@situ/<domain>/schema`
  even when it feels natural.
- **Sharing the app's typed db generic.** Drizzle's `BunSQLiteDatabase<TSchema>`
  is invariant in `TSchema`. Use `BunSQLiteDatabase<Record<string, unknown>>`
  plus `.select().from()` style queries.
- **Pulling app modules into the package.** Re-implement the 1–5 line
  helpers (`parseRecord`, `nowIso`) inside `__shared__/` rather than
  importing from `@situ/app/modules/*`. The package must have no static dep
  on the app.
- **Mixing pure analyzer with db reader.** Pure functions go in the package.
  Anything that joins app-owned tables stays in the app and calls the
  package's analyzer.
- **Two schema definitions.** Once moved, the app's `data/db/schema.ts`
  must re-export from `@situ/<domain>` — never declare the table in both
  places.

## Verification

```bash
bun install
bun --filter=@situ/<domain> run check
bun --filter=@situ/<domain> run test
bun --filter=@situ/app run check
bun --filter=@situ/app run test:<domain>             # moved/relocated slice
bun --filter=@situ/app run test:repositories         # repository contracts
bun --filter=@situ/app run test:<other affected>     # any slice your sweep touched
bun x oxfmt --check
bun x oxlint
bun x markdownlint-cli2 .agents/skills/situ-policy-<domain>-package/SKILL.md projects/app/packages/<domain>/README.md
mise run lint:policies
```

## Reporting

Report:

- Package name, what moved, what stayed (pure vs cross-domain split)
- The configure call signature and where wiring happens
- Which call sites changed and which deletions landed
- Which tests/checks were run and their outcomes
- Concurrent or pre-existing issues you noticed but did not fix

## See also

- `situ-policy-compute-package` — the worked example
- `situ-policy-barrel-exports`
- `situ-policy-repository-module-shape`
- `situ-policy-app-modules`
