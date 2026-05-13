---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0010. Use App Actions As Shared Write Boundary

## Context

The same product intent can come from the web UI, CLI, scheduler, or agent
tools. If each path writes records independently, behavior will drift.

## Decision

App actions are the shared write boundary.

```text
Replicache push
CLI command
agent tool
scheduler rule
  -> app action
      -> package repositories/mutations
      -> notifications when another actor should pay attention
      -> comments/events when user-visible
      -> sync version bump
```

A user-visible intent that changes multiple records should be one app action and
one synced transaction.

## Consequences

Package mutations stay primitive-specific.

App actions can be compound when the product intent is compound, such as
`claim_task`, `complete_review`, or `run_experiment_command`.

Actor resolution happens at the app action boundary. Package repositories store
the resulting actor fields without knowing whether the caller was UI, CLI,
scheduler, or agent tool.

## Related

- ADR 0007: Use Replicache Push As Primary Write API
- ADR 0008: Split Backend Into Primitive Packages
