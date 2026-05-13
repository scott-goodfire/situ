---
status: accepted
implementation_status: implemented
created: 2026-05-12
---

# 0029. Use Task As Agent Work Item

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

Status meanings:

- `triage`: captured but not yet clarified or prioritized
- `backlog`: ready to claim when it is useful to work on
- `in_progress`: assigned work is expected from the assignee
- `in_review`: waiting for review, verification, or acceptance
- `done`: no further action is expected for this task
- `blocked`: cannot proceed until a visible blocker is addressed
- `rejected`: intentionally not pursued, with rationale in comments or events

Task type is coarse routing and filtering, not workflow policy. Labels carry
nuance. Initial task types are:

```text
coordination, investigation, implementation, measurement, review, report
```

Use `type` for the broad mode of work an agent should expect. Use labels for
domain, priority nuance, risk, dataset, subsystem, or experimental condition.

## Consequences

Agents claim tasks directly. There is no separate delegation model.

`activeAgentSessionId` is transport state and does not replace assignment.

Task detail should show comments, labels, experiments, measurements, reviews,
artifacts, events, notifications, and active/recent agent sessions.

## Related

- ADR 0004: Use Linear-Like Primitives Over Workflows
- ADR 0026: Use Notifications As Agent Inbox And Wake Trigger
