---
name: situ-policy-compute-package
description: Use whenever adding or modifying code under projects/app/packages/compute, wiring @situ/compute into the app, or touching any compute lease/blocker/repository code that crosses the package boundary.
---

# `@situ/compute` Package Shape

Compute target leasing for situ ResearchTasks lives in its own workspace
package at `projects/app/packages/compute/`. The package owns the
`compute_targets` table, its repository, the operations that claim/release/
heartbeat leases, and the pure blocker analyzer. The app consumes the package
through a single barrel.

```text
projects/app/packages/compute/
├── package.json                       # @situ/compute, single barrel export
├── tsconfig.json                      # composite, extends tsconfig.base
├── README.md
└── src/
    ├── index.ts                       # single public barrel
    ├── module.ts                      # computeModule namespace
    ├── schema.ts                      # drizzle table + COMPUTE_TARGETS_TABLE_SQL
    ├── constants.ts                   # pool/label/lease constants
    ├── types.ts                       # exported types + ComputeContext
    ├── context.ts                     # configureCompute / getComputeContext
    ├── __shared__/                    # internal helpers (parseRecord, nowIso, …)
    ├── repository/                    # computeTargetRepository (raw CRUD)
    ├── operations/                    # claim, release, heartbeat, env, …
    └── blockers/                      # blockersForPlannedResearchTasks (pure)
```

## Rules

- **Single barrel export.** `src/index.ts` is the only public entry point.
  No sub-path exports in `package.json` — every consumer imports from
  `@situ/compute`.
- **`computeModule` is the high-level surface.** Operations are accessed
  through `computeModule.claimForResearchTask(...)`,
  `computeModule.releaseForWorkItem(...)`, etc. The names drop the leading
  `compute` prefix that the old `runtime/compute/` exports used — the
  namespace already tells you the domain.
- **Raw repository is still exported.** `computeTargetRepository` is
  re-exported on the barrel and accessible at `computeModule.targetRepository`
  for tools that want CRUD without the operation layer.
- **Module-level DI.** The app wires the package at boot by calling
  `configureCompute({ getDb, runSyncedWrite, recordAppEvent })`. `getDb` is a
  thunk so the package always reads the current db — tests that
  `resetDbForTests()` then re-`ensureRuntimeContext()` don't need to rewire.
- **Wire from `ensureRuntimeContext` via dynamic import.** The wiring helper
  in `data/db/configure-compute-package.ts` imports `app-events` and
  `data/db/sync`, both of which transitively import `data/db/client`.
  Loading it statically from `client.ts` would form an import cycle
  (`client → app-events → sync → client`). Use the dynamic import in
  `config/session-context.ts` to keep the static graph acyclic.
- **Cross-domain orchestration stays in the app.** Lease recovery
  (`runtime/lease-recovery/`) reads research tasks and work items, so it
  imports from `@situ/compute` rather than living inside it. Same for the
  blocker reader (`runtime/compute-blockers.ts`) which joins
  `research_tasks` (app) with `compute_targets` (package) and defers to the
  package's pure analyzer.
- **Schema lives in the package, migration string is sliced in.** The drizzle
  `computeTargets` table is defined in `packages/compute/src/schema.ts`. The
  app's `data/db/schema.ts` re-exports it. The runtime migrator
  (`data/db/migrate.ts`) interpolates `COMPUTE_TARGETS_TABLE_SQL` from the
  package into its `SCHEMA_SQL` block.
- **Structural types for cross-package shapes.** Operations accept
  `ResearchTaskLike = { id; type; payloadJson }` and
  `WorkItemLike = { payloadJson }` rather than importing the app's
  drizzle row types. This keeps the package's static dependency graph free
  of app schema references.
- **The package owns its `__shared__/`.** Internal helpers (`parseRecord`,
  `nowIso`, `PreconditionError`, payload-value getters) duplicate small
  pieces of the app's `modules/json`, `modules/date-time`, and
  `repositories/__shared__` rather than importing them. The package has no
  static dependency on `@situ/app`.
- **Tests:** pure unit tests (the blocker analyzer) live in the package.
  Integration tests that exercise the dispatch + research-task pipeline
  stay in the app under `runtime/lease-recovery/lease-recovery.test.ts`.
  `scripts/check.sh` runs `bun --filter=@situ/compute run test` for the
  package and `test:compute` for the app-side integration slice.

## Avoid

- Reaching into `packages/compute/src/__shared__/` or deep paths from
  outside the package. Always import from the barrel: `from "@situ/compute"`.
- Adding sub-path exports to `package.json` (e.g., `@situ/compute/schema`).
- Importing `@situ/app` symbols from inside the package, even transitively.
- Recreating wiring inside `data/db/client.ts` — the import cycle is the
  reason the wiring goes through `config/session-context.ts`.
- Recreating compute table definitions in the app's `data/db/schema.ts`.
  Re-export from `@situ/compute` instead.

## See also

- `situ-policy-barrel-exports`
- `situ-policy-repository-module-shape`
- `situ-policy-app-modules`
