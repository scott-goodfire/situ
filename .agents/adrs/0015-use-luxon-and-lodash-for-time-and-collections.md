---
status: accepted
implementation_status: partially_implemented
created: 2026-05-12
---

# 0015. Use Luxon And Lodash For Time And Collections

## Context

Time and collection logic become error-prone when every package hand-rolls date
math, duration math, grouping, sorting, and object transforms. Situ should keep
these operations boring and recognizable.

## Decision

Situ will prefer Luxon for time logic and lodash for collection logic when they
improve clarity.

Use Luxon `DateTime` and `Duration` for:

- current timestamps
- parsing and formatting ISO timestamps
- comparing notification snooze times
- staleness windows
- elapsed runtime
- scheduler intervals

Use lodash for collection/object operations when it is clearer than native code,
especially grouping, sorting, partitioning, keying, and compact object
transforms.

Shared wrappers for common time operations live in `@situ/common`. Product
records still store ISO strings at persistence and sync boundaries.

## Consequences

Avoid raw `new Date()` and number-based duration math in product code unless the
operation is trivial and local.

Prefer `nowIso()` and small common helpers for persistence timestamps.

Do not wrap every native array operation in lodash. Simple `.map`, `.filter`,
and `.find` are fine. Use lodash where it makes intent more obvious or avoids
repeated local helpers.

Tests should use deterministic clocks instead of relying on wall-clock time.

## Related

- ADR 0014: Use Readable TypeScript Conventions
- ADR 0022: Define Common Package Contract
- ADR 0026: Use Notifications As Agent Inbox And Wake Trigger
