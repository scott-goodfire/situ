# @situ/compute

Compute target leasing for situ ResearchTasks.

Owns the `compute_targets` table, its repository, and the operations that
claim/release/heartbeat compute leases on behalf of running Scientist
ResearchTasks. The main API surface is `computeModule` — a namespace object
that groups all operations:

```ts
import { computeModule } from "@situ/compute";

computeModule.configure({ db, recordAppEvent }); // once at boot
await computeModule.ensureDefaultLocalTargets({ desiredCount });
const claim = await computeModule.claimForResearchTask({ researchTask });
```

The package is consumed only by `@situ/app`. It declares its dependencies on
the app's database + app-events layer through a `configureCompute` context
that the app wires up once at startup. The package itself has no static
dependency on `@situ/app`.

## What's here

- `schema.ts` — drizzle `computeTargets` table + `COMPUTE_TARGETS_TABLE_SQL`
  used by the runtime migrator.
- `repository/` — `computeTargetRepository` (upsert, claim, release,
  heartbeat, drain, restore, listClaimed, etc.).
- `operations/` — `claimForResearchTask`, `releaseForWorkItem`,
  `heartbeatLeaseForWorkItem`, `envForWorkItem`, `ensureDefaultLocalTargets`,
  `liveTargetCount`, `poolForResearchTask`, `emptyStatusCounts`,
  `releaseTarget` (the lower-level helper used by lease recovery).
- `blockers/` — read-side analysis of why planned tasks are stuck waiting on
  compute (`blockersForPlannedResearchTasks`, `readBlockers`).
- `context.ts` — `configureCompute` + `getComputeContext` for dependency
  injection.
- `module.ts` — collects all operations into the `computeModule` namespace.

## What's NOT here

- **Lease recovery orchestration** — `runtime/lease-recovery/` in the app.
  Recovery is cross-domain (touches research tasks and work items), so it
  imports from `@situ/compute` rather than living inside it.
- **The runtime migrator** — `data/db/migrate.ts` in the app. The compute
  table's SQL fragment lives in this package as `COMPUTE_TARGETS_TABLE_SQL`,
  and the app's migrator interpolates it into the full schema string.

## Testing

`bun --filter=@situ/compute run test`. Tests use `createFreshComputeDb` from
`src/__test__/setup-test-db.ts` so they don't depend on the app's session
bootstrap.
