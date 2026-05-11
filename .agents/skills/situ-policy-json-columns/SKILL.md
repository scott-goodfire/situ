---
name: situ-policy-json-columns
description: Use whenever reading, writing, or reviewing *Json columns in repositories — payloadJson, metadataJson, or any text-stringified-JSON field.
---

# JSON Columns

`*Json` columns are stringified inside repositories. Callers see typed objects.

## Why

Callers think in domain objects, not in serialized strings. A page that touches `payloadJson` directly is coupled to the storage representation; rename a column or change the encoding and the page breaks. Repositories own the JSON round-trip so the rest of the app doesn't.

## Rules

- Columns ending in `Json` (`payloadJson`, `metadataJson`) are `text`
  columns holding stringified JSON, default `"{}"` for empty.
- Repositories `JSON.stringify` on write. On read, parse through
  `jsonModule.parseRecord({ raw })` from `modules/json` — it handles
  `JSON.parse` plus the unknown-to-`Record<string, unknown>` guard in one
  call, returning `{}` on malformed input.
- Callers never see the raw string. Wrap each column in a tiny
  repository-local helper (e.g., `workItemPayload`, `targetMetadata`)
  that names what the column represents.
- Repository return types document the parsed shape — don't leak `*Json`
  field names.

## Avoid

- A page, CLI command, or agent tool touches a `*Json` field directly.
- `JSON.parse(JSON.stringify(...))` to coerce shapes — design the type instead.
- `JSON.parse(value ?? "null")` — should be `?? "{}"` so the parsed value
  matches the declared type.

## See also

- `situ-policy-drizzle-query-style`
- `situ-policy-mutations-via-runsyncedwrite`
