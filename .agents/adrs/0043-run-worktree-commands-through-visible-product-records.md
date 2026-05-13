---
status: accepted
implementation_status: verified
created: 2026-05-12
---

# 0043. Run Worktree Commands Through Visible Product Records

## Context

ADR 0035 gives worktree isolation special treatment because filesystem
collisions are real. The remaining decision is how command execution should
become durable product state without adding a workflow-only command-run model.

## Decision

Experiment command execution is an app action that uses `@situ/worktrees` for
filesystem safety and existing product records for durable history.

The command action validates:

- actor
- task
- experiment
- project
- assignment or permission to act
- command cwd inside the claimed workspace or worktree
- command environment allowlist
- timeout

The action records visible state:

```text
command_started event
  -> @situ/worktrees runs subprocess
  -> command_finished event
  -> stdout/stderr artifacts when useful
  -> parsed measurements when real metrics are present
  -> candidate commit update only through capture_candidate_commit
```

Command stdout and stderr are never hidden in process memory when they matter.
Short, useful output may appear in an event summary. Large, truncated, or
debuggable output becomes an artifact.

Measurements are created only from parsed metric values. Raw command text does
not become a measurement.

The experiment's current candidate commit changes only through the existing
candidate-commit app action. Older measurements, reviews, and artifacts keep
their original commit references.

## Consequences

`@situ/worktrees` owns path containment, environment filtering, subprocess
execution, timeouts, captured output, and git/worktree helpers.

`@situ/app` owns product persistence around commands.

Agent tools expose command execution as thin wrappers over the app action. They
do not directly run subprocesses.

There is no first-class `CommandRun` product primitive. Events, artifacts,
measurements, and experiment commits are the durable command record.

If command history later needs its own lifecycle, ownership, retention policy,
or query surface, introduce that as a separate decision.

## Related

- ADR 0032: Model Experiments As PR-Like Candidate Branches
- ADR 0033: Make Measurements, Reviews, And Artifacts Revision-Aware
- ADR 0035: Use Worktrees For Experiment Isolation
