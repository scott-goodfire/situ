---
name: situ-policy-status-tone-helper
description: Use whenever adding, modifying, or reviewing status-to-UI-tone mappings — ResearchTask tones, research status tones, priority tones, or any new entity that needs a DxBadge tone helper.
---

# Status Tone Helper

Each entity that surfaces a status (or priority) in a `DxBadge` exports
a tone helper from `packages/app-ui/src/__shared__/`. The helper is an
exhaustive switch that returns a `DxBadgeTone`.

```ts
import type { DxBadgeTone } from "@situ/web-ui";
import type { ResearchTaskStatus } from "@situ/protocol";

export function researchTaskStatusTone({ status }: { status: ResearchTaskStatus }): DxBadgeTone {
  switch (status) {
    case "verified":
      return "success";
    case "running":
    case "awaiting_verification":
      return "warning";
    case "failed":
      return "danger";
    case "planned":
    case "rejected":
    case "pruned":
    case "canceled":
      return "neutral";
  }
}
```

## Why

Switches over the typed status union give exhaustiveness checks at
compile time — when a new status lands in `@situ/protocol`, the helper
fails to type-check until it's mapped. Centralizing the mapping also
means the same tone shows up across list views, detail views, and any
future surface.

## Rules

- File: `packages/app-ui/src/__shared__/<entity>-tones.ts` for entity-bound
  tones, or a topical file like `research-status-tone.ts` when one
  helper covers many entities.
- One exported function per dimension (status, priority). Function name
  is `<entity><Dimension>Tone`.
- Signature:
  `({ <dimension> }: { <dimension>: <Type> }): DxBadgeTone`.
- Body is a single `switch` over the union. Every case is listed; no
  `default` branch — the type-checker enforces exhaustiveness.
- `DxBadgeTone` comes from `@situ/web-ui`. Status types come from
  `@situ/protocol`, or from app-ui domain records when the UI owns an
  adapted status union.
- Tone vocabulary maps to the badge variants:
  `success`, `warning`, `danger`, `info`, `neutral`.
- Each helper has a co-located `*.test.ts` exercising every status value.

## Avoid

- A list view or detail view that builds a tone with an inline
  conditional — call the shared helper.
- A `default:` branch in the switch — silently maps new statuses to a
  fallback tone.
- A helper that returns a string outside the `DxBadgeTone` union.
- Two helpers for the same entity dimension (`researchTaskStatusTone` and
  `researchTaskStatusBadgeColor`) — pick one home.

## See also

- `situ-policy-status-enum-pair`
- `situ-policy-list-view-shape`
- `situ-policy-detail-view-shape`
