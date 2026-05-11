---
name: situ-policy-status-enum-pair
description: Use whenever adding, modifying, or reviewing a status enum in @situ/protocol — research statuses, task statuses, compute target statuses, or any new state machine.
---

# Status Enum Pair

Each status enum exports two things: a const array of all runtime values
and a typed union derived from that array.

```ts
export const RESEARCH_STATUSES = [
  "triage",
  "accepted",
  "active",
  "in_review",
  "done",
  "canceled",
  "failed",
] as const;

export type ResearchStatus = (typeof RESEARCH_STATUSES)[number];
```

## Why

The array is for runtime iteration (form selects, validation, UI
filters). The union is for type safety in records. Deriving the union
from the array keeps status values in one place and removes manual
array/union drift.

## Rules

- File: `projects/web/packages/protocol/src/status.ts`.
- Const: `export const <NAME>_STATUSES = ["v1", "v2", ...] as const;`.
- Type: `export type <Name>Status = (typeof <NAME>_STATUSES)[number];`.
- Both export from `protocol/src/index.ts`.
- Status names are snake_case strings (`in_review`, not `inReview`) to
  match DB column values.
- Keep the runtime status read model out of this file. It lives in
  `status-record.ts` because it describes the Replicache `status` value, not
  a status enum.

## Avoid

- A status type without its companion `*_STATUSES` array.
- Hand-writing a literal union that duplicates the array values.
- camelCase status values.
- Defining a status union inline in a record type instead of in
  `status.ts`.
- Adding non-status protocol DTOs to `status.ts`.

## See also

- `situ-policy-protocol-record-types`
- `situ-policy-status-record-transitions`
