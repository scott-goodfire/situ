---
name: situ-policy-timestamps
description: Use whenever persisting, parsing, formatting, or comparing timestamps anywhere in projects/app or projects/web — createdAt, updatedAt, completedAt, activity timestamps, sync metadata, UI labels, or chart axes.
---

# Timestamps

Persisted timestamps come from `dateTimeModule.nowIso()`. All other
timestamp work — parsing, formatting, arithmetic, comparisons — goes
through Luxon `DateTime`, not native `Date`.

## Why

Consistent ISO format across all rows means `createdAt` and `updatedAt`
sort lexicographically and round-trip cleanly through JSON. SQL
`CURRENT_TIMESTAMP` produces a different format than `dateTimeModule.nowIso()`
(no `T`, no `Z`, no fractional seconds), breaking the comparison.

Luxon `DateTime` keeps timezone, parsing, and formatting decisions in one
library with a single set of bugs. Mixing `new Date()`, `Date.parse()`,
and `toISOString()` invites silent locale and timezone surprises and
makes durations ("2h 12m in") and tick scales ("every 30 minutes") hard
to read.

## Rules

### Persisted writes (projects/app)

- `dateTimeModule.nowIso()` from `modules/date-time` is the only source of
  timestamps written into rows or sync payloads.
- Repository `create` and `update` methods compute one
  `const now = dateTimeModule.nowIso()` at the top and reuse it for
  `createdAt` / `updatedAt`.
- Activity rows recorded alongside an entity write share that timestamp.

### All other timestamp work (projects/app and projects/web)

- Parse with `DateTime.fromISO(iso)`. Check `.isValid` before using.
- Get the current moment with `DateTime.utc()` (for ISO writes) or
  `DateTime.now()` (for local-time formatting / `toRelative`).
- Format with `dt.toLocaleString(...)`, `dt.toFormat(...)`, or
  `dt.toRelative(...)`. Do not call `Date#toLocaleString` on a parsed value.
- Compute differences with `dt.diff(other, "minutes")`,
  `.plus({ hours: 2 })`, `.startOf("hour")`. Do not subtract `Date.parse`
  values to do duration math in `src`.
- Compare with `a < b` on `DateTime` instances or with
  `a.toMillis() - b.toMillis()`, not by string-comparing `toISOString()`
  outputs (lexicographic comparison only works on a uniform Z-suffixed
  shape).

### When native `Date` is allowed

- `Date.now()` is acceptable only for in-process duration math
  (`Date.now() - start`); never for persisted values, never for parsing
  or formatting.
- A browser API or third-party callback that demands a `Date` (e.g.,
  `<input type="datetime-local">` value parsing, some chart libraries).
  Convert at the boundary: `dt.toJSDate()` /
  `DateTime.fromJSDate(jsDate)`.
- Tests may use raw `new Date(...).toISOString()` for fixed inputs;
  `src` must not.

## Avoid

- A `create` method calling `dateTimeModule.nowIso()` more than once and
  storing different timestamps on the entity vs its initial activity.
- A migration script using SQL `CURRENT_TIMESTAMP` when the surrounding
  code path could call `dateTimeModule.nowIso()`.
- A module importing Luxon to get the current persistable time when
  `dateTimeModule.nowIso()` would do.
- A view computing tick positions or "X minutes ago" labels with
  `Date.parse` and arithmetic — use `DateTime.fromISO` and `.diff`.
- A model file mixing `new Date(iso)` and `DateTime.fromISO(iso)` in the
  same module. Pick Luxon and stay there.

## See also

- `situ-policy-mutations-via-runsyncedwrite`
