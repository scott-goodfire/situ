# @situ/work-items

Durable work-item queue for situ. Owns the `work_items` table, its
repository, and the queue mechanics: enqueue, claim, complete, retry/fail,
heartbeat, and lease recovery. Purpose-agnostic — every operation takes a
`purpose: string`, and the app decides what each purpose means.

```ts
import { workItemModule } from "@situ/work-items";

workItemModule.configure({ getDb, runSyncedWrite, recordAppEvent }); // once at boot

const { workItemId } = await workItemModule.enqueue({
  purpose: "claude.scientist_research_task",
  targetKind: "researchTask",
  targetId: task.id,
  payload: { activeResearchTaskId: task.id },
});

const claimed = await workItemModule.claimDue({
  leaseMs: 10 * 60 * 1000,
  purpose: "claude.scientist_research_task",
});

const stale = await workItemModule.recoverExpiredLeases({ maxAttempts: 3, limit: 20 });
// `stale` is the WorkItem[] of items that crossed the maxAttempts threshold —
// the caller decides what side-effects to run for each (release compute, etc.).
```

## What's here

- `schema.ts` — drizzle `workItems` table + `WORK_ITEMS_TABLE_SQL` for the
  runtime migrator.
- `repository/` — `workItemRepository.list({ status, purposePrefix, since, limit })`.
- `operations/` — `enqueue`, `claimDue`, `countClaimed`, `complete`,
  `failOrRetry`, `extendLease`, `recoverExpiredLeases`, `payload`
  (`workItemPayload` returns a typed `WorkItemPayload` parsed via the zod
  schema, with `.loose()` passthrough for unknown keys).
- `types.ts` — `WorkItem`, `WorkItemRecord`, `WorkItemHandler`,
  `WorkItemPayload`, `WorkItemStatus`, `workItemPayloadSchema`.
- `context.ts` — `configureWorkItems` / `getWorkItemsContext` /
  `resetWorkItemsContextForTests` for the package's module-level DI.
- `module.ts` — collects all operations into the `workItemModule` namespace.

## What's NOT here

- **Purpose constants** — `runtime/work-items/purposes.ts` in the app.
  Constants like `CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE` are
  app-domain (Claude-specific); they import nothing from this package.
- **Handler dispatch** — `runtime/work-items/handlers.ts` in the app. The
  `handleClaimedWorkItem` composer wires a purpose → handler map (Claude
  agent execution, verifier work, etc.), runs heartbeats for both the
  work-item lease and the compute lease, and on failure releases compute.
  It imports from this package for queue mechanics and `@situ/compute`
  for lease management.
- **Compute coupling** — `recoverExpiredLeases` does not call
  `computeModule.releaseForWorkItem` itself. It returns failed items; the
  app's scheduler iterates and releases compute. Keeps the package free
  of cross-domain orchestration.

## Testing

`bun --filter=@situ/work-items run test`. The package ships pure unit
tests for payload parsing. Integration tests that exercise the
dispatch + handler flow stay in the app under
`runtime/work-items/handlers.test.ts` and
`runtime/work-items/claim-work-item.test.ts`.
