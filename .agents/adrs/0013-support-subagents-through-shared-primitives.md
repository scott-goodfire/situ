---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0013. Support Subagents Through Shared Primitives

## Context

Modern coding-agent systems are moving toward parallel and delegated agent work,
including Cursor-style orchestration, Codex subagent threads, and Claude managed
subagents.

The risk is building a hidden orchestration engine where subagents pass private
payloads around and product state becomes impossible to inspect.

## Decision

Situ will support subagents through shared product primitives.

Subagents coordinate by reading and writing:

- tasks
- comments
- notifications
- experiments
- measurements
- reviews
- artifacts
- events

Child Claude session threads become `AgentSession` records, but product state
still lives in the primitives above.

Subagent handoff is durable product state, not a private return value. A parent
or coordinator gives a subagent context by creating or assigning a task,
commenting on the task, linking relevant experiments/evidence, and notifying
the agent. The subagent finishes by writing comments, measurements, reviews,
artifacts, task updates, or experiment updates. The parent reads those records
instead of relying on hidden child-thread memory.

## Consequences

The app can fan out work without inventing private workflow messages.

If a coordinator wants a scientist to work, it creates or assigns a task and
creates a notification. If a verifier requests changes, it writes a review and
comment, then creates a notification.

Agent prompts and tools may make agents specialized, but the database should
remain readable as a normal board of work and evidence.

## Related

- ADR 0004: Use Linear-Like Primitives Over Workflows
- ADR 0015: Use Notifications As Agent Inbox And Wake Trigger
