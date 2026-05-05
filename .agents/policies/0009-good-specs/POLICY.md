---
title: Good Specs
status: active
---

# Policy: Good Specs

## Applies To

All files under `.agents/specs/*/SPEC.md`.

## Rule

A good spec is a product or architecture contract that helps future agents make
better implementation decisions. It should be specific enough to guide work, but
not so detailed that it prematurely designs code.

## Required Checks

- The spec has a clear purpose and names the behavior, boundary, or product
  decision it governs.
- The spec explains why the decision matters, not only what the decision is.
- The spec defines what is in scope and what is intentionally deferred.
- The spec uses product language first and implementation details only when they
  define a boundary or guarantee.
- The spec is actionable for future implementation and review.
- The spec links to adjacent specs or policies when the relationship matters.
- The spec avoids stale roadmap promises. If a feature is deferred, say so
  directly.

## Red Flags

- The spec is just brainstorming notes with no decision.
- The spec locks in database schemas, file names, or framework details before
  they are necessary.
- The spec repeats another spec instead of narrowing or clarifying it.
- The spec describes a future platform while the MVP remains undefined.
- The spec uses vague phrases like "make it robust" without observable criteria.

## Examples

Good:

```md
The first slice has no primary web UI. The TypeScript Ink TUI is the product
surface and must show objective, session status, active hypotheses, active
experiment, recent activities, artifacts when useful, and timeline.
```

Weak:

```md
Build a nice dashboard with good UX and strong observability.
```
