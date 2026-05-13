---
status: accepted
implementation_status: verified
created: 2026-05-12
---

# 0042. Integrate Claude Managed Agent Runtime

## Context

ADR 0023 chooses Claude Managed Agents as the execution substrate. The backend
needs a concrete runtime contract for creating, resuming, observing, and
recovering Claude sessions without introducing a generic provider layer.

## Decision

`projects/app/src/managed-agents/` owns the Claude Managed Agents integration.

The runtime creates or resumes Claude sessions from visible product state:

```text
Notification
  -> target task, review, experiment, or project
  -> Agent
  -> AgentSession
  -> Claude session/thread
```

`AgentSession` is the durable transport record for Claude runtime state. It
stores:

- local agent id
- optional parent agent session id
- remote Claude agent id
- remote Claude session id
- remote Claude session thread id
- context target
- current notification id
- status
- last activity timestamp
- remote event cursor

Claude remote events are stored as agent-session transport logs before they are
interpreted. A remote event changes product state only when it is processed
through an app action.

Tool calls from Claude route through thin agent tools. Tool results are sent
back to Claude after the corresponding app action, command, or read completes.

The runtime does not include `provider` fields, provider registries, or
provider-neutral abstractions. Claude-specific names are acceptable where they
make the integration clearer.

## Consequences

Callbacks and polling endpoints may exist for Claude runtime traffic, but they
are not normal product write endpoints. Product writes still flow through app
actions.

Session resume should prefer the existing `AgentSession` when Claude supports
continuing the same thread. If resume fails, the old session is marked failed
and a new session can be created for the same agent and target.

Claude session failure must preserve product state. The task, comments,
notifications, experiments, measurements, reviews, artifacts, and events remain
the source of truth.

AgentSession logs are for replay and debugging. Product audit entries live in
`@situ/events`.

Subagents are represented as child `AgentSession` records plus ordinary tasks,
comments, notifications, and evidence. A child session result is not a private
workflow payload.

## Related

- ADR 0023: Use Claude Managed Agents As Execution Substrate
- ADR 0024: Support Subagents Through Shared Primitives
- ADR 0025: Use AgentSessions For Claude Runtime State
- ADR 0036: Keep Agent Tools Thin Over App Actions
