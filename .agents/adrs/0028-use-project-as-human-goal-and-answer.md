---
status: accepted
implementation_status: implemented
created: 2026-05-12
---

# 0028. Use Project As Human Goal And Answer

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
- confidence summary
- blockers summary
- open questions summary
- progress checkpoints summary
- final result summary
- timestamps

Project statuses stay human-facing:

```text
active, paused, blocked, complete, archived
```

`blocked` means the project summary should explain the visible blocker.
`paused` means the human or coordinator intentionally stopped new work for now.
`complete` means the final result summary and report artifacts are ready for
the human. These statuses are dashboard state, not hidden scheduler policy.

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
- ADR 0039: Generate Reports From Durable Records
