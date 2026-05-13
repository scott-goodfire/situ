---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0036. Keep Agent Tools Thin Over App Actions

## Context

Agent tools can easily become a hidden workflow API. If tools encode special
research steps, the UI and durable records stop explaining the system.

## Decision

Agent tools are thin wrappers over app actions.

Tools map to visible product actions:

- list/search/get/update tasks
- list unread notifications
- mark notifications read or unread
- dismiss or snooze notifications
- create comments
- assign/unassign tasks
- create experiments
- create measurements
- create reviews
- create artifacts
- run read-only workspace commands
- run experiment worktree commands
- list recent events

Specialized tools are acceptable only when they protect real boundaries, such
as filesystem safety.

## Consequences

Avoid tools named after workflow steps such as
`submit_research_task_for_verification` when a task status update plus comment
is enough.

Tool results should be concise and structured. Failure returns stable codes and
actionable hints.

UI, CLI, scheduler, and agent tools should share behavior through app actions.

## Related

- ADR 0021: Use App Actions As Shared Write Boundary
- ADR 0035: Use Worktrees For Experiment Isolation
