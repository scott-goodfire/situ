---
status: accepted
implementation_status: verified
created: 2026-05-12
---

# 0044. Recover Stale Agent Work Through Visible State

## Context

ADR 0027 rejects hidden leases for ordinary agent work. The scheduler still
needs concrete recovery behavior so stuck assignments, failed wake attempts, and
dead sessions become inspectable state rather than silent retries.

## Decision

The scheduler recovers stale agent work through visible product records.

Staleness is inferred from:

- task status
- task assignee
- task last activity timestamp
- notification read, dismissed, snoozed, and delivery attempt timestamps
- agent session status
- agent session last activity timestamp
- recent comments and events

The scheduler does not own a private job queue for product work. It scans
visible rows and writes visible rows.

When a notification is wakeable, the scheduler records a delivery attempt and
wakes or resumes the recipient agent through the Managed Agents runtime.

When assigned work is stale, recovery writes:

- a comment on the task explaining the recovery
- an event with the reason and relevant timestamps
- task assignment/status updates when the next action should return to the
  board
- notifications for the next actor when someone should pay attention

When Claude resume or wake repeatedly fails, recovery writes:

- failed `AgentSession` state
- delivery-attempt metadata
- an event with the structured error details
- a task comment when product work is affected

The scheduler should not dismiss a notification merely because delivery was
attempted. Dismissal remains an inbox action by the recipient or a visible
product decision.

## Consequences

Users and agents can explain recovery by reading comments, events, task state,
notifications, and agent sessions.

Repeated wake attempts are acceptable while a notification remains unread,
undismissed, and unsnoozed. If those attempts produce no useful work, staleness
recovery creates visible context and returns the task to a useful board state.

Thresholds and filters are configuration, not product state. The product record
should show what happened, not every timer the scheduler used.

If a future workflow truly needs exclusive ownership, model that explicitly for
the narrow collision domain. Do not generalize it into leases for ordinary
task ownership.

## Related

- ADR 0026: Use Notifications As Agent Inbox And Wake Trigger
- ADR 0027: Use Visible Staleness Instead Of Leases
- ADR 0042: Integrate Claude Managed Agent Runtime
