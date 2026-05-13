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
- running worktree commands have explicit ownership to avoid collisions
- destructive git commands are allowed only inside the claimed worktree
- command cwd must resolve inside the claimed workspace or worktree
- command environment is filtered to an allowlist
- commands have timeouts and captured exit status
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

Command execution is represented by existing durable records, not a separate
product primitive for command runs:

```text
run_experiment_command app action
  -> validate actor, task, experiment, project, assignment, and worktree
  -> record command_started event
  -> @situ/worktrees runs subprocess with filtered env, timeout, captured output
  -> record command_finished event
  -> store stdout/stderr artifacts when non-empty or truncated
  -> create measurements only from parsed metric values
  -> update experiment candidate commit only through capture_candidate_commit
```

If command history later needs its own lifecycle, ownership, or query surface,
introduce that as its own decision. Until then, events, artifacts,
measurements, and experiment commits are the durable command record.

## Related

- ADR 0021: Model Experiments As PR-Like Candidate Branches
- ADR 0022: Make Measurements, Reviews, And Artifacts Revision-Aware
