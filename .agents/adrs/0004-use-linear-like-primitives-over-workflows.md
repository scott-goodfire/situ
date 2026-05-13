---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0004. Use Linear-Like Primitives Over Workflows

## Context

Workflow systems often encode handoff through private schemas, hidden queues,
leases, and hard-coded transitions. That makes systems hard for agents to
recover from by reading visible state.

Linear is a useful reference because humans coordinate through simple visible
primitives: issues, comments, statuses, labels, assignments, attachments,
activity, and views.

## Decision

Situ will model agent coordination with simple product primitives instead of a
hidden workflow engine.

The core interaction pattern is:

```text
agent reads task
  -> assigns itself
  -> comments with context
  -> creates experiments/evidence
  -> moves visible status
  -> another agent is notified
```

Status is navigation, not policy. Labels carry filterable nuance. Comments carry
narrative handoff. Events explain what happened.

## Consequences

The scheduler should be small and should not own research policy.

If the next step matters, it should be visible as a task, comment,
notification, review, artifact, measurement, or event.

Agents should be able to recover by reading the project board and evidence, not
by knowing which function invoked them.

## Related

- ADR 0003: Make Humans Summary-First And Agents Board-First
- Reading: [Linear workflow statuses](https://linear.app/docs/configuring-workflows)
- Reading: [Linear labels](https://linear.app/docs/labels/)
