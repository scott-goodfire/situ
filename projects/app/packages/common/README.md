# @situ/common

Shared low-level helpers used by every situ workspace package and the app.
Single source of truth for primitives that were previously duplicated five
times across `__shared__/` folders.

```ts
import {
  PreconditionError,
  nowIso,
  clampRepositoryLimit,
  matchesRepositorySearch,
  parseRecord,
  coerceRecord,
} from "@situ/common";
```

## What's here

- **`PreconditionError`** — structured error class with `code`, `hint`,
  optional `details`. Caught by `defineTool` to produce model-recoverable
  envelopes; thrown by repositories when a precondition the model can fix
  isn't met (record not found, terminal status, missing FK target). Sets
  `name = "PreconditionError"` so the duck-type check in
  `defineTool` keeps working across class identities.
- **`nowIso()`** — ISO-8601 UTC timestamp. Wraps `luxon.DateTime.utc().toISO()`
  so callers don't need a luxon import for one common operation.
- **`clampRepositoryLimit({ limit?, max? })`** — repository pagination
  guard. Defaults to `limit=10`, `max=50`; truncates fractional input;
  treats non-finite values as the default.
- **`matchesRepositorySearch({ query?, values })`** — case-insensitive
  substring filter used by `*Repository.search` methods. Returns `true`
  when query is empty/whitespace.
- **`parseRecord({ raw })`** / **`coerceRecord({ value })`** — JSON →
  `Record<string, unknown>` with safe `{}` fallback. `parseRecord` parses
  a string then coerces; `coerceRecord` coerces an already-decoded value.

## What's NOT here

- **Package-specific `__shared__/` helpers** stay in their packages —
  e.g., `status-record-repository.ts` (research-records),
  `target-metadata.ts` / `work-item-payload.ts` (compute),
  `clamp-number.ts` / `safe-path-segment.ts` / `process-output.ts`
  (worktrees), `required-text.ts` (research-projects).
- **App `modules/` capability objects** (`dateTimeModule`, `jsonModule`,
  `textModule`, etc.) stay in the app. They're the in-app-only convenience
  wrappers and predate the package extractions.

## Testing

`bun --filter=@situ/common run test`. The helpers have unit tests covering
the edge cases (non-finite inputs to `clampRepositoryLimit`, malformed
JSON to `parseRecord`, empty queries to `matchesRepositorySearch`,
`PreconditionError` shape).
