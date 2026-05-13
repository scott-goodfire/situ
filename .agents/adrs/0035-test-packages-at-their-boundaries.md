---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0035. Test Packages At Their Boundaries

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
- notification wake rules test unread, read, dismissed, snoozed, and stale
  inbox rows

Live model behavior belongs in evals.

Eval scenarios should assert durable records, not only final prose. Important
eval rubrics include:

- subagent handoff can be reconstructed from tasks, comments, notifications,
  and evidence
- stale work recovery writes visible comments/events and preserves unfinished
  context
- requested changes are fixed on the same experiment branch when appropriate
- reports cite current measurements, reviews, artifacts, and discarded paths
- Claude session failures preserve product state and create recoverable
  follow-up work

## Consequences

Agents should be able to implement one package and run that package's tests
without understanding the entire backend.

Cross-package behavior is tested through app actions, not by reaching through
package internals.

Live evals should assert durable records, not final prose alone.

## Related

- ADR 0014: Split Backend Into Primitive Packages
- ADR 0016: Use App Actions As Shared Write Boundary
- ADR 0017: Define Common Package Contract
