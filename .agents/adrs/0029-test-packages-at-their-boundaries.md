---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0029. Test Packages At Their Boundaries

## Context

The backend is intentionally split into primitive packages and app-level
composition. Tests should follow those boundaries so subagents can implement and
verify pieces independently.

LLM-dependent behavior is not deterministic enough for normal unit tests.

## Decision

Package behavior is tested where the behavior lives.

Test boundaries:

- package repositories and mutations have colocated deterministic tests
- app actions have tests at the action boundary
- sync composition has tests for push, pull, deletion, and key prefixes
- worktree and command execution has tests with temporary directories
- scheduler rules have tests over visible task, agent, agent session,
  notification, and event rows
- notification wake rules test unread, read, acted, and stale inbox rows

Live model behavior belongs in evals.

## Consequences

Agents should be able to implement one package and run that package's tests
without understanding the entire backend.

Cross-package behavior is tested through app actions, not by reaching through
package internals.

Live evals should assert durable records, not final prose alone.

## Related

- ADR 0008: Split Backend Into Primitive Packages
- ADR 0010: Use App Actions As Shared Write Boundary
- ADR 0011: Define Common Package Contract
