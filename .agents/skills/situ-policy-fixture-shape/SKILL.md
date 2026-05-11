---
name: situ-policy-fixture-shape
description: Use whenever adding, modifying, or reviewing a fixture file under projects/web/packages/app-ui/src/fixtures — new entity fixtures, story data, or eval inputs.
---

# Fixture Shape

Each entity has one fixture file at
`packages/app-ui/src/fixtures/<entity>.ts` exporting a typed
`<ENTITY>_FIXTURES` array.

```ts
import type { HypothesisRecord } from "../domain/records";
import { SESSION_ID, daysAgo, hoursAgo, minutesAgo } from "./helpers";

export const HYPOTHESIS_FIXTURES: HypothesisRecord[] = [
  {
    id: "hyp_cache_ttl_01",
    sessionId: SESSION_ID,
    createdByResearchTaskId: "research_task_cache_ttl_01",
    title: "Cache TTL ceiling affects reuse",
    // ...
    createdAt: daysAgo(3),
    updatedAt: daysAgo(2),
  },
  // ...
];
```

## Why

Stories, fixtures-tests, and eval inputs all want the same shape:
hand-written, deterministic records that exercise the relevant states.
Centralizing means a story for `HypothesesListView` and a snapshot for the
runtime smoke see exactly the same data.

## Rules

- File name: `fixtures/<plural-entity>.ts` (`hypotheses.ts`, `evaluations.ts`).
- Single export: `<UPPER_ENTITY>_FIXTURES: <Entity>Record[]`.
- Records are typed against `../domain/records` (or `@situ/protocol`
  re-exports).
- Timestamps come from `helpers.ts` factories (`daysAgo`, `hoursAgo`,
  `minutesAgo`) so fixture data sorts deterministically.
- Shared session id is `SESSION_ID` from `helpers.ts`.
- Each fixture file covers the major states for that entity: at least
  one of every status, plus interesting field variants
  (parent-child, terminal, in-flight).
- `fixtures/index.ts` re-exports every `<ENTITY>_FIXTURES` constant.
- `fixtures.test.ts` validates that the shapes match the record types.

## Avoid

- Inline fixture data inside a `.stories.tsx` file.
- Hard-coded ISO timestamps (use `daysAgo(n)` etc.).
- A fixture file that exports more than one entity's fixtures — split.
- A fixture that omits required record fields and `as any`-casts to
  paper over the gap.
- Random session ids; use `SESSION_ID`.

## See also

- `situ-policy-storybook-stories`
- `situ-policy-list-view-shape`
- `situ-policy-detail-view-shape`
- `situ-policy-protocol-record-types`
