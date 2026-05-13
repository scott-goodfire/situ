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

App action names are verb-object names in snake case, such as:

- `create_project`
- `create_task`
- `assign_task`
- `claim_task`
- `update_task_status`
- `create_comment`
- `mark_notification_read`
- `mark_notification_unread`
- `dismiss_notification`
- `snooze_notification`
- `run_experiment_command`
- `record_review`

## Consequences

Package mutations stay primitive-specific.

App actions can be compound when the product intent is compound, such as
`claim_task`, `record_review`, or `run_experiment_command`.

Compound actions only bundle visible primitive mutations that belong to one
human-readable intent. They must not encode hidden workflow steps. For example,
`record_review` may create a review, write a comment, update task or experiment
status, notify the scientist, and record events in one transaction. It should
not run verifier policy outside visible records.

Actor resolution happens at the app action boundary. Package repositories store
the resulting actor fields without knowing whether the caller was UI, CLI,
scheduler, or agent tool.

An app action that changes user-visible state is responsible for deciding
whether to create comments, notifications, and events. Package repositories
should not wake agents or emit cross-package side effects by themselves.

External Claude calls should not happen inside the same database transaction as
product writes. Persist the intended visible state first, then let the
scheduler or Managed Agents integration perform external wake/resume work and
record the result.

For `assign_task`, the app action validates the actor and task, updates
assignee and activity timestamp, creates a `task_assigned` notification when the
assignee is an agent, records a task assignment event, and bumps sync versions
in one transaction.

## Related

- ADR 0007: Use Replicache Push As Primary Write API
- ADR 0008: Split Backend Into Primitive Packages
