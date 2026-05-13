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
- acted timestamp
- delivery attempt timestamps when useful
- created timestamp

The scheduler wakes agents with unread notifications. The agent then reads its
inbox, opens the target task or experiment, and acts through normal tools.

## Consequences

Notifications are not workflow jobs. They do not prescribe an exact function to
run.

The scheduler can be simple:

```text
unread notification
  -> wake recipient agent
  -> agent reads target
  -> agent acts through normal primitives
```

Read and acted timestamps are visible inbox state, not leases.

## Related

- ADR 0004: Use Linear-Like Primitives Over Workflows
- ADR 0016: Use Visible Staleness Instead Of Leases
