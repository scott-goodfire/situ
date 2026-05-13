---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0014. Use AgentSessions For Claude Runtime State

## Context

The term "thread" is overloaded. It can mean a comment thread, review thread,
Slack thread, or Claude session thread. Situ needs a clearer durable name for
runtime state that is not product state.

## Decision

Situ will use `AgentSession` for Claude Managed Agents runtime and transport
state.

`AgentSession` records include:

- local agent id
- remote Claude session id
- remote Claude session thread id
- project or task context
- status
- last activity timestamp
- remote event cursor

`AgentSession` does not include a `provider` field because Situ is tightly
integrated with Claude.

## Consequences

`Agent` is the visible actor.

`Task` is the work item.

`Notification` explains why the agent woke up.

`AgentSession` explains how Claude communicated.

If an agent session vanishes, another session should be able to reconstruct the
work from tasks, comments, notifications, experiments, measurements, reviews,
artifacts, and events.

## Related

- ADR 0012: Use Claude Managed Agents As Execution Substrate
- ADR 0013: Support Subagents Through Shared Primitives
