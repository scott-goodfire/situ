---
title: Experiment Workspaces
status: active
---

# Policy: Experiment Workspaces

## Applies To

Managed experiment worktrees, workspace tools, experiment execution, baseline
and candidate measurement setup, run logs, artifacts, worktree cleanup, and
review of code state produced by Scientist experiment tasks.

## Rule

Candidate experiments should run in managed experiment workspaces when Git is
available. The user's selected checkout is the base workspace and observation
surface, not the autonomous scratchpad for candidate edits.

The durable research record is app-owned. Worktrees and scratch logs are
execution state that must be linked back to experiments, measurements,
activities, and artifacts.

## Required Checks

- Scientist `experiment` tasks use a managed worktree path when the task or
  linked experiment has one.
- Baseline, planning, interpretation, and review work may inspect the selected
  workspace, but candidate code edits and candidate commands run in the
  experiment workspace.
- Fresh Git-backed sessions and new experiment worktrees require a clean base
  workspace unless the product explicitly records an accepted dirty baseline.
- Experiment records preserve worktree path, base commit, candidate commit when
  available, parent experiment lineage when relevant, and task/evaluation links.
- Workspace state is inspected before interpreting baseline or candidate
  measurements when the workspace may affect comparability.
- Final worktree state is captured for successful and failed experiment tasks.
  Failed experiments can still contain useful evidence.
- Scratch command output such as `run.log` belongs in Situ runtime artifact/log
  locations such as `SITU_RUN_LOG` or `SITU_ARTIFACT_DIR`, not in the target
  repo by default.
- Commands, useful stdout/stderr summaries, metric bundles, and artifact paths
  are recorded as measurement evidence or activity payloads when they matter.
- Changes to tests, evals, benchmarks, fixtures, dependency files, generated
  files, or toolchain config are surfaced as comparability concerns unless the
  task explicitly covers them.
- Nested workspace paths are resolved relative to the actual Git worktree root.
  Reused worktrees must not append nested path fragments twice.
- Cleanup code may remove only managed temporary/worktree state it owns. It
  must not delete user work or run destructive Git commands on the selected
  checkout.
- Evals or deterministic tests cover worktree routing, candidate workspace
  capture, and review of linked worktree evidence when those paths change.

## Red Flags

- Scientist candidate edits happen directly in the user's selected checkout.
- Baseline setup mutates source, tests, dependencies, or generated files.
- A candidate result is accepted without naming the command and code state that
  produced it.
- Runtime logs are written into the researched repo and left as untracked
  clutter without being intentional artifacts.
- Destructive Git commands such as reset, checkout, clean, or branch deletion
  run against the user's selected branch without explicit user intent.
- Worktree paths are treated as the durable source of truth instead of
  experiment and activity records.
- Review or Critic work evaluates an experiment without linked worktree,
  commit, command, measurement, and activity context.
- A failed experiment loses the partial diff, dirty state, or command context
  needed to understand the failure.

## Review Questions

- Did this candidate run somewhere isolated from the user's selected checkout?
- Can a reviewer find the base commit, candidate state, command, metrics, and
  changed files?
- Are non-comparable results preserved as evidence but surfaced as concerns?
- Is every destructive or cleanup action limited to Situ-owned workspace state?
