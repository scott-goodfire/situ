---
name: situ-policy-status-record-transitions
description: Use whenever implementing, modifying, or reviewing status transitions on records that track state — accept, submit, complete, cancel, fail, or any status flip.
---

# Status Record Transitions

Records with a `ResearchRecordStatus` field transition through one factory.

## Why

The factory's `assertCanTransition` guard prevents a `done` record from re-transitioning. Hand-rolled transitions skip this guard and silently produce two activity rows, two `completedAt` timestamps, and an overwritten result summary. The factory is the only place that gets terminal-state semantics right.

## Rules

- `accept` / `submit` / `complete` / `cancel` / `fail` come from
  `createStatusRecordTransitions` in
  `repositories/__shared__/status-record-repository.ts`.
- Pass: `idKey`, `defaultActor`, `recordLabel`, `updateStatus`,
  `insertActivity`, `requireRecord`. Nothing else.
- `updateStatus` and `insertActivity` run inside the same `runSyncedWrite`
  block the factory provides — don't wrap them again.
- Terminal statuses (`done`, `canceled`, `failed`) are entered only
  through the factory so `assertCanTransition` applies.
- Repositories using transitions today: `baselines`, `evaluations`,
  `experiments`, `hypotheses`. New status-bearing
  repositories follow the same pattern.

## Avoid

- A repository hand-rolling `accept` / `complete` / `cancel` with its own
  `runSyncedWrite` and `update().set({ status })`.
- A status flip outside the factory (e.g., inline status update inside
  `create` other than the initial value).
- An activity row for a status change recorded without going through the
  factory's `insertActivity` callback.

## See also

- `situ-policy-mutations-via-runsyncedwrite`
- `situ-policy-repository-function-vocabulary`
