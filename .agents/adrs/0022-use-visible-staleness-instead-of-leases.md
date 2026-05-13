---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0022. Use Visible Staleness Instead Of Leases

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
- notification read, dismissed, and snoozed state
- agent session last activity
- recent events/comments

When work is stale, the scheduler writes a visible comment/event, clears or
updates assignment as needed, and returns the task to the board.

If wake or resume repeatedly fails, the scheduler should:

- record the failed attempt on the notification
- mark the failed agent session state
- write an event with the error code and remote ids
- leave the notification undismissed
- eventually comment on the task and requeue it if no visible work happens

The scheduler is a visible-state scanner. Its baseline responsibilities are:

- wake agents for unread, undismissed, unsnoozed notifications
- record wake/resume attempts and failures
- detect stale assigned work from visible timestamps and activity
- requeue stale work by writing comments, events, assignment changes, task
  status changes, and notifications through app actions

It should not choose research strategy, silently auto-complete work, or create
hidden jobs. If future scheduler behavior assigns ready backlog work from
filters, that assignment must still be a visible app action with an assignment
event and notification.

## Consequences

The system is less precise than a lease system but easier to inspect.

Explicit ownership records are reserved for real collision risks, such as
command execution and worktree ownership.

Stale recovery should be testable over visible rows, not private scheduler
memory.

## Related

- ADR 0021: Use Notifications As Agent Inbox And Wake Trigger
- ADR 0030: Use Worktrees For Experiment Isolation
