---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0023. Derive Branch And Frontier Views Before Adding Branch Models

## Context

Global search creates lineages and frontiers. It is tempting to add a `Branch`
model immediately. That would add lifecycle, status, ownership, and sync surface
before the product proves it needs them.

## Decision

Situ will derive branch, frontier, and best-candidate views from existing
records before adding a `Branch` model.

Derived views can use:

- parent experiment links
- parent task links
- measurements
- reviews
- labels
- experiment statuses
- timestamps

## Consequences

There is no `Branch` package initially.

Add a `Branch` model only if branches need first-class lifecycle such as branch
owner, budget, status, frontier position, or persisted best-known score.

Materialized summaries may be added for performance, but they must point back
to source records.

## Related

- ADR 0002: Optimize For Global Maxima Search
- ADR 0021: Model Experiments As PR-Like Candidate Branches
