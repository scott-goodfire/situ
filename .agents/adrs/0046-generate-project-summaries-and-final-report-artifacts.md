---
status: accepted
implementation_status: verified
created: 2026-05-12
---

# 0046. Generate Project Summaries And Final Report Artifacts

## Context

ADR 0039 says reports come from durable records. The human experience also
needs current project summaries during the run, not only a final report after
everything is done.

## Decision

Project summaries and final reports are generated from durable records.

Project summary fields are materialized views over the board:

- current baseline summary
- current answer summary
- confidence summary
- blockers summary
- open questions summary
- progress checkpoints summary
- final result summary

Summary generation reads:

- project goal
- tasks
- comments
- experiments
- measurements
- reviews
- artifacts
- events
- unresolved notifications when they explain blockers

Summary text may be written by an agent, but the agent must cite durable record
ids in comments, report sections, or artifact metadata when practical.

The final report is an `Artifact` attached to the project. `Project.status =
complete` means the final report artifact and final result summary are ready
for the human.

Reporter output includes:

- markdown report artifact
- optional chart or patch artifacts
- cited measurements, reviews, experiments, and discarded paths
- open questions or follow-up tasks when the answer is incomplete

Private agent memory is not report evidence.

## Consequences

Humans can read summary views first and drill into the board when needed.

Reports can be regenerated or audited because claims point back to durable
records.

Project summaries are allowed to be denormalized for UX, but source records stay
authoritative.

Reporter agents should update project summaries through app actions. They
should not write directly to project rows outside the shared write boundary.

If summary generation needs evals, evals should assert the durable records and
citation behavior, not only prose quality.

## Related

- ADR 0003: Make Humans Summary-First And Agents Board-First
- ADR 0028: Use Project As Human Goal And Answer
- ADR 0039: Generate Reports From Durable Records
