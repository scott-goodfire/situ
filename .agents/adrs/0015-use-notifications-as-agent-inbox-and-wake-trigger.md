---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0015. Use Notifications As Agent Inbox And Wake Trigger

## Context

The desired mental model is that agents are asleep until something asks for
their attention. A scheduler that directly resumes agents based on hidden
workflow state would make the system harder to inspect.

Linear-like tools use inbox and notification concepts to tell people what needs
attention. Agents can use the same pattern.

## Decision

Situ will use `Notification` as a first-class inbox and wake primitive.

Notifications include:

- recipient actor
- type
- target record
- title
- optional markdown body
- read timestamp
- dismissed timestamp
- snoozed until timestamp
- delivery attempt timestamps when useful
- created timestamp

Initial notification types are:

- `task_assigned`
- `review_requested`
- `changes_requested`
- `comment_mentioned`
- `project_steering_updated`
- `stale_work_requeued`

The scheduler wakes agents with unread, undismissed, unsnoozed notifications.
The agent then reads its inbox, opens the target task or experiment, and acts
through normal tools.

## Consequences

Notifications are not workflow jobs. They do not prescribe an exact function to
run.

The scheduler can be simple:

```text
unread + undismissed + unsnoozed notification
  -> wake recipient agent
  -> agent reads target
  -> agent acts through normal primitives
```

Read, dismissed, and snoozed timestamps are visible inbox state, not leases.

`readAt` means the recipient saw or loaded the notification. It does not imply
that any product work happened.

`dismissedAt` means the recipient cleared the notification from its inbox
because it no longer needs attention. Dismissal is an inbox action. It is not a
delivery ack, tool success flag, job completion marker, or proof that the
target work is done.

`snoozedUntil` temporarily hides the notification from wake scans. When the
snooze expires, the notification becomes wakeable again. If the target changes
materially before then, create a new unread notification and leave the old
snoozed notification as history.

If an agent wakes but cannot make progress, it should usually leave the
notification undismissed and write a comment or event explaining the blocker.

Notifications should be deduplicated by recipient, type, and target while an
equivalent notification is still unread, undismissed, or snoozed. If the
underlying target changes materially, create a new notification rather than
mutating old history.

Delivery attempts are scheduler state on the notification. A failed wake records
attempt metadata and an event, but does not dismiss the notification.

## Related

- ADR 0004: Use Linear-Like Primitives Over Workflows
- ADR 0016: Use Visible Staleness Instead Of Leases
- Reading: [Linear Inbox](https://linear.app/docs/inbox)
