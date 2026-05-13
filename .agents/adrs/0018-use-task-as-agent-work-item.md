---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0018. Use Task As Agent Work Item

## Context

Agents need a visible unit of work that can be assigned, commented on, labeled,
reviewed, and moved through simple statuses. This should feel like a Linear
issue, but optimized for agent work.

## Decision

`Task` is the main unit of agent planning, handoff, execution, and review.

Tasks record:

- title
- body markdown
- status
- type
- priority
- creator actor
- assignee actor
- active agent session
- parent task
- project
- optional target record
- labels
- last activity timestamp
- timestamps

Task statuses stay small:

```text
triage, backlog, in_progress, in_review, done, blocked, rejected
```

## Consequences

Agents claim tasks directly. There is no separate delegation model.

`activeAgentSessionId` is transport state and does not replace assignment.

Task detail should show comments, labels, experiments, measurements, reviews,
artifacts, events, notifications, and active/recent agent sessions.

## Related

- ADR 0004: Use Linear-Like Primitives Over Workflows
- ADR 0015: Use Notifications As Agent Inbox And Wake Trigger
