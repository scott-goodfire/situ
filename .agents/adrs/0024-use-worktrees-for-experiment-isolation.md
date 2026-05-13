---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0024. Use Worktrees For Experiment Isolation

## Context

Agents will run commands and mutate repository files. Without isolation,
parallel experiments and retries can corrupt each other's state.

Worktree isolation is stricter than the rest of the product model because file
system collisions are real.

## Decision

Mutating candidate work happens in experiment worktrees.

Rules:

- command tools run in an explicit workspace
- candidate mutations happen in experiment worktrees
- every experiment worktree is attached to an `Experiment`
- destructive git commands are allowed only inside the claimed worktree
- command output is captured
- parsed metrics become measurements
- logs and bulky output become artifacts

## Consequences

`@situ/worktrees` owns filesystem safety: path resolution, worktree ownership,
environment filtering, timeouts, command execution, stdout/stderr capture, and
candidate commit capture.

App actions own product persistence around commands: events, artifacts,
measurements, comments, and experiment commit updates.

A replacement scientist should be able to reopen the same experiment worktree
after reading the task and review history.

## Related

- ADR 0021: Model Experiments As PR-Like Candidate Branches
- ADR 0022: Make Measurements, Reviews, And Artifacts Revision-Aware
