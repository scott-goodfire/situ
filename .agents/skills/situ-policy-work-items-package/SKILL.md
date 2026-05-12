---
name: situ-policy-work-items-package
description: Use whenever adding or modifying code under projects/app/packages/work-items, wiring @situ/work-items into the app, or touching any enqueue, claim, lease, retry, or work-item handler dispatch code that crosses the package boundary.
---

# `@situ/work-items` Package Shape

Durable work-item queue for situ lives in its own workspace package at
`projects/app/packages/work-items/`. The package owns the `work_items`
table and the queue mechanics: enqueue, claim, complete, retry/fail,
heartbeat, and lease recovery. It is **purpose-agnostic** — every
operation takes a `purpose: string`, and the app decides what each
purpose means.

```text
projects/app/packages/work-items/
├── package.json                # @situ/work-items, single barrel
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts                # public barrel
    ├── module.ts               # workItemModule namespace
    ├── schema.ts               # drizzle workItems table + WORK_ITEMS_TABLE_SQL
    ├── types.ts                # WorkItem, WorkItemPayload schema, WorkItemHandler
    ├── context.ts              # configureWorkItems / getWorkItemsContext
    ├── __shared__/             # PreconditionError, nowIso, parseRecord, …
    ├── repository/             # workItemRepository.list
    └── operations/
        ├── payload.ts          # workItemPayload + zod schema
        ├── enqueue.ts          # idempotent insert by (purpose, targetKind, targetId)
        ├── claim-due.ts        # claim a pending item with bounded lease
        ├── count-claimed.ts
        ├── complete.ts
        ├── fail-or-retry.ts    # retries with backoff or marks failed
        ├── extend-lease.ts     # heartbeat
        └── recover-expired-leases.ts  # returns failed WorkItem[] for compute release
```

## Rules

- **Single barrel.** Consumers import from `@situ/work-items`. No sub-path
  exports.
- **`workItemModule` is the high-level surface.** Operations are
  `workItemModule.enqueue(...)`, `workItemModule.claimDue(...)`,
  `workItemModule.complete(...)`, etc. Names drop the `WorkItem` suffix
  the old in-app exports carried — the namespace tells you the domain.
- **Module-level DI.** `configureWorkItems({ getDb, runSyncedWrite,
recordAppEvent })` wired from `data/db/configure-work-items-package.ts`
  via dynamic import in `ensureRuntimeContext` (same pattern as compute).
  `getDb` is a thunk so test resets pick up new dbs without rewiring.
- **Purpose-agnostic.** The package never references Claude-specific
  purpose constants (`CLAUDE_*_WORK_ITEM_PURPOSE`). Those live in
  `runtime/work-items/purposes.ts` in the app and are passed in as
  strings.
- **No cross-domain side effects.** `recoverExpiredLeases` returns the
  `WorkItem[]` that crossed `maxAttempts` and ended up failed — it does
  not call `computeModule.releaseForWorkItem` itself. The scheduler's
  lease sweeper iterates the returned items and runs the compute release.
- **Workspace re-exports.** `data/db/schema.ts` does
  `import { workItems } from "@situ/work-items"; export { workItems };`
  because the FK on `claudeAgentRuns.workItemId` references the table by
  identity — re-export-only would not bring it into scope.
- **Migration string.** `data/db/migrate.ts` interpolates
  `WORK_ITEMS_TABLE_SQL` from this package; the inline `CREATE TABLE
work_items (...)` block has been removed from the migrator.
- **PreconditionError duck-typing applies.** The package's
  `PreconditionError` class is distinct from the app's — `defineTool`
  matches by `error.name === "PreconditionError"` plus `code`/`hint`
  fields, so structured envelopes work across packages.

## App-side composition (`runtime/work-items/`)

The app keeps the Claude-specific composition layer:

- `purposes.ts` — `CLAUDE_*_WORK_ITEM_PURPOSE` constants
- `handlers.ts` — `handleClaimedWorkItem` composes the queue + compute
  lease management + Claude execution dispatch. The handler map keys are
  the purpose constants. Heartbeats run for both the work-item lease
  (`workItemModule.extendLease`) and the compute lease
  (`computeModule.heartbeatLeaseForWorkItem`); on completion or failure
  the compute lease is released.
- `index.ts` — re-exports the package's public surface (`workItemModule`,
  `workItemRepository`, types) alongside the app-side handlers and
  purpose constants.

## Avoid

- Importing from inside the package's `__shared__/` or operation files
  directly. Use the barrel: `import { workItemModule } from "@situ/work-items"`.
- Adding sub-path exports (`@situ/work-items/schema`).
- Importing `@situ/app` symbols (Claude execution, repositories,
  observability) from inside the package — even transitively.
- Hard-coding compute release calls inside `recoverExpiredLeases`. The
  package returns failed items; the app composes the side-effects.
- Adding new Claude-specific purpose constants to the package's
  `types.ts`. They belong in `runtime/work-items/purposes.ts` in the app.

## See also

- `situ-policy-compute-package`
- `situ-policy-worktrees-package`
- `situ-extract-app-package`
- `situ-policy-barrel-exports`
