---
status: accepted
implementation_status: implemented
created: 2026-05-12
---

# 0030. Use Labels For Filterable Nuance

## Context

Status sprawl makes boards harder to reason about. Many differences are not
workflow states; they are filterable nuance such as risk, area, confidence, or
needed attention.

## Decision

Situ will use task labels for filterable nuance.

Examples:

- `area:sync`
- `risk:high`
- `needs:verification`
- `signal:promising`
- `source:agent`

Labels are owned by the tasks package.

## Consequences

Labels do not trigger hidden workflow by themselves.

Schedulers and views may filter on labels, but any action still happens through
visible task, comment, notification, or event changes.

Archived labels remain on existing tasks for history but are not suggested for
new tasks.

## Related

- ADR 0004: Use Linear-Like Primitives Over Workflows
- ADR 0029: Use Task As Agent Work Item
