---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0017. Use Project As Human Goal And Answer

## Context

Humans need one top-level object that explains what they asked for and what the
system currently believes. Agent tasks and experiments are too detailed to be
the primary human interface.

## Decision

`Project` is the human-level goal and answer object.

It records:

- goal markdown
- status
- current baseline summary
- current answer summary
- open questions summary
- final result summary
- timestamps

The visible task board owns the current state of the run. The project owns the
human-facing summary of that run.

## Consequences

Project summaries must be generated from durable records, not agent memory.

Agent sessions may carry the goal in Claude context, but the `Project` record is
the durable source of truth.

The UI can be summary-first while preserving read-only drilldown into tasks and
evidence.

## Related

- ADR 0003: Make Humans Summary-First And Agents Board-First
- ADR 0028: Generate Reports From Durable Records
