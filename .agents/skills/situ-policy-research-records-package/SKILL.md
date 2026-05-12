---
name: situ-policy-research-records-package
description: Use whenever adding or modifying code under projects/app/packages/research-records, wiring @situ/research-records, or touching hypothesis/experiment/baseline/evaluation/measurement/artifact/entity-link repositories at the package boundary.
---

# `@situ/research-records` Package Shape

Durable research-record entities for situ live in their own workspace
package at `projects/app/packages/research-records/`. The package owns the
seven record tables (hypotheses, experiments, baselines, evaluations,
measurements, artifacts, entity-links) plus their four activity tables,
and exposes one repository per record type aggregated into the
`researchRecordsModule` namespace.

```text
projects/app/packages/research-records/
├── package.json                       # @situ/research-records, single barrel
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts                       # public barrel
    ├── module.ts                      # researchRecordsModule namespace
    ├── schema.ts                      # 11 tables + RESEARCH_RECORDS_TABLES_SQL
    ├── types.ts                       # ResearchRecordStatus, record types
    ├── context.ts                     # configureResearchRecords / getResearchRecordsContext
    ├── __shared__/                    # PreconditionError, nowIso, status-record-repository, …
    └── repositories/
        ├── hypotheses/
        ├── experiments/
        ├── baselines/
        ├── evaluations/
        ├── measurements/
        ├── artifacts/
        └── entity-links/
```

## Rules

- **Cluster package shape.** Unlike single-domain packages (compute,
  work-items), this package houses **seven repositories** that share
  schemas + the `createStatusRecordTransitions` lifecycle helper. The
  barrel exports each repository individually AND aggregates them into
  `researchRecordsModule.{hypotheses, experiments, baselines, evaluations,
measurements, artifacts, entityLinks}`.
- **Single barrel.** Consumers import from `@situ/research-records`. No
  sub-path exports.
- **`createStatusRecordTransitions` lives inside the package.** It's only
  used by the four status-bearing repositories (hypotheses, experiments,
  baselines, evaluations). It was moved out of the app's
  `repositories/__shared__/` during the extraction — the app no longer
  has it.
- **Module-level DI.** `configureResearchRecords({ getDb, runSyncedWrite })`
  wired from `data/db/configure-research-records-package.ts` via dynamic
  import in `ensureRuntimeContext`. No `recordAppEvent` callback — these
  repositories use per-record `_activities` tables for audit, not
  `app_events`.
- **Internal FKs are drizzle-typed.** experiments→hypotheses,
  experiments→experiments (parent), evaluations→baselines/experiments,
  measurements→evaluations, \*\_activities→parent record. External FKs
  (research_tasks, claude_agents, research_projects) are kept at the SQL
  level only — the drizzle `.references()` is dropped.
- **Workspace re-exports.** `data/db/schema.ts` does
  `import { hypotheses, experiments, … } from "@situ/research-records"; export { … };`
  because some app schema declarations and call sites need the symbols in
  scope, not just re-exported.
- **No cross-domain side effects.** Repositories that need to coordinate
  with `research_projects` (the only multi-table mutation in the original
  baseline repo) do _not_ live here. The cross-domain wrapper
  `createOrUpdateProjectBaseline` lives in
  `data/repositories/baselines/create-or-update-project-baseline.ts` in
  the app and composes the package's `baselineRepository` with
  `researchProjectRepository.transition`.
- **`baselineRepository.create` requires `researchProjectId`.** The
  auto-resolution from `createdByResearchTaskId` (which calls into
  `researchTaskRepository`) happens at the app side — every caller must
  pass `researchProjectId` explicitly. The Scientist `create_baseline`
  tool fetches the active task and forwards
  `task.researchProjectId`.

## App-side composition (`data/repositories/baselines/`)

Thin wrapper folder. Holds:

- `create-or-update-project-baseline.ts` — cross-domain helper that does
  the baseline upsert + research_project phase update in one synced
  transaction.
- `index.ts` — re-exports the helper. The app imports
  `createOrUpdateProjectBaseline` from this folder and `baselineRepository`
  from `@situ/research-records` separately.

Other research-record repositories don't need an app-side wrapper — they
have no cross-domain transactions.

## Avoid

- Importing from inside the package's `__shared__/` or sub-package
  folders. Use the barrel: `import { hypothesisRepository } from "@situ/research-records"`.
- Adding sub-path exports (`@situ/research-records/hypotheses`).
- Importing `@situ/app` symbols (researchProjectRepository, etc.) from
  inside the package.
- Moving `createStatusRecordTransitions` back to the app's
  `__shared__/` — it has no other consumers, and shipping it inside the
  package keeps the lifecycle abstraction co-located with the records
  that use it.
- Adding new cross-domain transactions to package repositories. If a
  write needs to touch tables outside this package, add a thin app-side
  wrapper alongside `createOrUpdateProjectBaseline`.

## See also

- `situ-policy-compute-package`
- `situ-policy-worktrees-package`
- `situ-policy-work-items-package`
- `situ-extract-app-package`
- `situ-policy-barrel-exports`
