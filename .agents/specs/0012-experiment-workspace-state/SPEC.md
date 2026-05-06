# Experiment Workspace State

## Purpose

Situ should not treat an experiment result as self-explanatory command
output. A result is only interpretable when the workspace state around it is
visible.

This spec defines the first-slice contract for making candidate experiments
comparable to baseline evidence.

## Product Thesis

Autoresearch loops commonly mutate code while measuring whether a change helped.
That makes git state, eval command, dependency state, and changed file category
part of the evidence.

The user should be able to answer:

> What code state produced this result, what changed from baseline, did the
> evaluation surface change, and is this result comparable?

## Workspace State Boundary

Each baseline or candidate measurement should preserve enough state to explain
the result:

- Workspace path
- Current branch when available
- Current commit when available
- Whether the workspace is dirty
- Tracked and untracked changed paths
- A coarse classification of changed paths
- The command used for evaluation
- The interpreter or toolchain choice when it affects comparability
- Any obvious process concerns

The first slice can store this as activity payload metadata and artifact
references rather than introducing a new top-level WorkspaceState model.

## Changed Path Categories

The first slice should classify changed paths coarsely:

- Source or product code
- Tests, evals, benchmarks, fixtures, or measurement harnesses
- Dependency and toolchain configuration
- Generated or cache files
- Unknown or mixed files

The classification does not have to be perfect. It exists to make obvious trust
risks visible and to guide human review.

## Run Branch Strategy

Situ should prefer isolated experiment branches over mutating the user's
mainline branch.

Suggested branch shape:

```text
situ/<session-or-run-id>
```

Using git in this way is experiment bookkeeping, not a claim that a candidate is
ready to ship. Accepted candidates can remain as branch commits for later
review. Rejected candidates can be reset to the prior accepted state.

The first slice may guide the agent toward this workflow before fully owning the
branch lifecycle in typed tools.

## Comparability Rules

An experiment result is more trustworthy when:

- It starts from a known baseline commit or explicitly accepted dirty baseline.
- It uses the same evaluation command as baseline.
- It uses the same interpreter or toolchain as baseline.
- It does not modify the evaluation surface unless the experiment is explicitly
  about tests or eval coverage.
- It does not modify dependencies unless the experiment is explicitly about
  setup or toolchain behavior.
- It leaves generated files out of the research diff.

A result can still be useful when these rules are violated, but Situ should
surface the violation as a concern rather than silently treating the result as
comparable.

## In Scope

- Recording workspace state observations as measurement evidence.
- Flagging dirty starts, eval/test changes, dependency changes, generated file
  clutter, and changed test counts as concerns.
- Showing concern comments in the live session.
- Guiding agents to use an isolated branch for autonomous candidate work.

## Deferred

- A full branch manager that automatically creates, switches, commits, resets,
  stashes, and cherry-picks on behalf of the user.
- Sandboxed virtualenv recreation per experiment.
- Docker or containerized execution.
- Perfect language-aware classification of changed files.
- A standalone WorkspaceState database model.

## Product Rule

Situ should not only show that tests passed. It should show which workspace
state made them pass and whether that state is comparable to the baseline.
