---
status: accepted
implementation_status: implemented
created: 2026-05-12
---

# 0031. Use Comments For Handoff And Events For Audit

## Context

Agents need narrative handoff. The system also needs audit/debug facts. Combining
both into one record would either make handoffs too noisy or make audit trails
too vague.

## Decision

Situ will keep `Comment` and `Event` separate.

`Comment` is human-readable narrative:

- what was tried
- what changed
- what is confusing
- what another agent should inspect
- what context matters

`Event` is append-only audit/debug fact:

- type
- actor
- target
- message
- payload JSON
- created timestamp

## Consequences

If another agent needs to read an update as part of work, write a comment.

If the system needs timeline/debug/audit information, record an event.

Important state changes can create both.

Comments stay markdown-first and should not get typed `kind` values unless a
future concrete query proves the need.

Do not add a separate discussion or threading primitive just to organize review
back-and-forth. Review discussion is represented by comments attached to tasks,
experiments, reviews, artifacts, or measurements.

If review conversations later need their own lifecycle, ownership, or query
surface, introduce that as its own decision.

## Related

- ADR 0005: Use Markdown As The Handoff Format
- ADR 0026: Use Notifications As Agent Inbox And Wake Trigger
