---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0028. Generate Reports From Durable Records

## Context

A final answer that exists only in model memory is not trustworthy. The human
needs to know what was tried, what evidence exists, what was verified, and what
was discarded.

## Decision

Reports are generated from durable records.

Reporter input includes:

- project goal and baseline
- completed and rejected tasks
- experiment lineage
- measurements
- reviews
- artifacts
- important comments and events
- unresolved notifications when they explain blockers

Reporter output includes:

- `REPORT.md`
- optional charts
- patch artifacts for kept candidates
- open questions and next tasks

## Consequences

Reports can explain both wins and discarded branches.

The project final result summary should be a concise human-facing summary of
the same durable evidence.

Reporter agents should not rely on private conversation history as the source
of truth.

## Related

- ADR 0003: Make Humans Summary-First And Agents Board-First
- ADR 0017: Use Project As Human Goal And Answer
