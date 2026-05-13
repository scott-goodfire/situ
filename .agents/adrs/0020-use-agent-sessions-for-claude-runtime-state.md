---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0020. Use AgentSessions For Claude Runtime State

## Context

The term "thread" is overloaded. It can mean a comment thread, review thread,
Slack thread, or Claude session thread. Situ needs a clearer durable name for
runtime state that is not product state.

## Decision

Situ will use `AgentSession` for Claude Managed Agents runtime and transport
state.

`AgentSession` records include:

- local agent id
- optional parent agent session id, when spawned by another session
- remote Claude session id
- remote Claude session thread id
- project or task context
- current notification id, when the session was woken by a notification
- status
- last activity timestamp
- remote event cursor

`AgentSession` does not include a `provider` field because Situ is tightly
integrated with Claude.

Agent session statuses are transport state:

```text
active, idle, failed, closed
```

`active` means the session is currently being driven. `idle` means it may be
resumed. `failed` means recovery is needed. `closed` means the session was
intentionally ended.

## Consequences

`Agent` is the visible actor.

`Task` is the work item.

`Notification` explains why the agent woke up.

`AgentSession` explains how Claude communicated.

Product records may include `agentSessionId` as provenance when helpful, but
the visible actor is still the `Agent` and the visible work item is still the
`Task`. Session context can point at a project, task, notification, or parent
session; it cannot replace those records.

If an agent session vanishes, another session should be able to reconstruct the
work from tasks, comments, notifications, experiments, measurements, reviews,
artifacts, and events.

`@situ/agent-sessions` also owns durable Claude transport logs when they are
needed for replay or debugging:

- raw remote events
- tool call ids and arguments
- tool result summaries
- remote cursors

These transport logs are not product audit events. Product-visible audit entries
still live in `@situ/events`.

Claude remote events and tool calls become product truth only when processed
through app actions. If a remote event is stored in an agent-session log but no
app action created or changed a product record, the product state did not
change.

If a Claude session cannot be resumed, mark the old agent session failed,
record an event, clear `Task.activeAgentSessionId` if it points at unusable
state, and create a new `AgentSession` for the same assigned agent when possible.
Do not dismiss the waking notification unless the agent explicitly clears it
after reading the target state.

## Related

- ADR 0018: Use Claude Managed Agents As Execution Substrate
- ADR 0019: Support Subagents Through Shared Primitives
