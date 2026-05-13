---
status: accepted
implementation_status: not_applicable
created: 2026-05-12
---

# 0002. Optimize For Global Maxima Search

## Context

The project is experimental. The point is not to safely migrate an existing
workflow into a slightly more automated version of itself. The point is to find
whether agentic search can reach better outcomes than a narrow scripted loop.

This implies branching, backtracking, failed attempts, verification, and
synthesis. Discarded work is not waste if it helps map the search space.

## Decision

Situ will optimize for global maxima search.

The product model must preserve attempted branches, evidence, reviews, and
discarded paths. It should be easy to ask:

- what was tried
- what changed
- what evidence was produced
- whether the evidence was trusted
- what was discarded
- what is currently the best verified candidate

## Consequences

The architecture needs first-class `Experiment`, `Measurement`, `Review`, and
`Artifact` records.

Reports must include both wins and discarded branches.

The app should avoid hiding exploration inside a private run graph. If the
search made progress or ruled something out, that should appear in durable
records.

The system can prefer a more exploratory architecture over a safer,
incremental workflow migration.

## Related

- ADR 0001: Build A Local Autoresearch App
- Architecture: `.agents/docs/architecture/DOC.md`
