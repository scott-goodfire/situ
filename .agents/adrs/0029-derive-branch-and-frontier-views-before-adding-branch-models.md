---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0029. Derive Branch And Frontier Views Before Adding Branch Models

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

Initial derivation rules:

- an experiment's current revision is its current candidate commit
- evidence is current for an experiment when its commit field is empty or
  matches the current candidate commit
- frontier work is active or in-review experiments and their open tasks
- terminal experiments are accepted, rejected, or abandoned
- best-candidate views prefer accepted experiments with current approving
  reviews and relevant measurements, then in-review or active experiments with
  current evidence and no blocking review
- domain-specific scores must be measurements, not hidden scoring fields
- ties can be resolved by recency until a package spec defines a better view

## Consequences

There is no `Branch` package initially.

Add a `Branch` model only if branches need first-class lifecycle such as branch
owner, budget, status, frontier position, or persisted best-known score.

Materialized summaries may be added for performance, but they must point back
to source records and record which derivation produced them.

## Related

- ADR 0002: Optimize For Global Maxima Search
- ADR 0027: Model Experiments As PR-Like Candidate Branches
