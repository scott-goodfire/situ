---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0018. Use Claude Managed Agents As Execution Substrate

## Context

Situ is explicitly exploring Claude Managed Agents and managed subagents. The
project does not need an abstract multi-provider agent runtime at this stage.

Adding a provider abstraction now would increase cognitive load and hide the
most important integration details.

## Decision

Situ will tightly integrate with Claude Managed Agents as the execution
substrate.

The app persists Claude remote identifiers that are needed for operation:

- remote Claude agent id
- remote session id
- remote session thread id
- raw event cursor
- tool calls and results

The durable product model still uses Situ primitives. Claude transport details
live in `AgentSession` and Managed Agents integration code.

## Consequences

Do not add `provider` fields or generic provider registries.

`projects/app/src/managed-agents/` owns Claude session adaptation, callbacks,
tool-result routing, and remote event ingestion.

If a future system needs another provider, introduce that as its own decision
with a real reason.

## Related

- ADR 0020: Use AgentSessions For Claude Runtime State
- Architecture: `.agents/docs/architecture/DOC.md`
