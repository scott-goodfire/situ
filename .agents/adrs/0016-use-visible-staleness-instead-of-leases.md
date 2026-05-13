---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0016. Use Visible Staleness Instead Of Leases

## Context

Workflow systems often use leases and locks to recover abandoned work. Leases
are precise but can be hard for agents and humans to understand from the
visible product state.

Situ wants human-like work ownership: assigned work, visible activity, inbox
notifications, comments, and recovery comments when work goes stale.

## Decision

Ordinary agent work uses visible staleness instead of hidden leases.

Staleness is inferred from:

- task assignment
- task status
- task last activity
- notification read/acted state
- agent session last activity
- recent events/comments

When work is stale, the scheduler writes a visible comment/event, clears or
updates assignment as needed, and returns the task to the board.

## Consequences

The system is less precise than a lease system but easier to inspect.

Explicit ownership records are reserved for real collision risks, such as
command execution and worktree ownership.

Stale recovery should be testable over visible rows, not private scheduler
memory.

## Related

- ADR 0015: Use Notifications As Agent Inbox And Wake Trigger
- ADR 0024: Use Worktrees For Experiment Isolation
