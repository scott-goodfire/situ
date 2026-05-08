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

This is stored as activity payload metadata and artifact references. A
top-level WorkspaceState model is out of scope.

## Changed Path Categories

Changed paths are classified coarsely:

- Source or product code
- Tests, evals, benchmarks, fixtures, or measurement harnesses
- Dependency and toolchain configuration
- Generated or cache files
- Unknown or mixed files

The classification does not have to be perfect. It exists to make obvious trust
risks visible and to guide human review.

## Managed Worktree Strategy

Situ should run candidate experiment work in managed Git worktrees rather than
mutating the user's selected workspace checkout.

The durable session state and project research records remain app-owned. A worktree is an
execution checkout for one candidate experiment, not the source of truth for the
research record. Deleting or preserving a worktree must not decide whether the
experiment happened; project records do.

Before a Scientist handles an `experiment` task, Situ should:

- Require the base workspace's Git repo to be clean, including untracked files.
- Record the base commit used for the candidate.
- Create or reuse a managed detached worktree for that experiment.
- Run the Scientist's workspace tools and worker commands with that worktree as
  their workspace root.
- Record the final worktree state as experiment evidence.

Workspace command scratch output, such as redirected `run.log` files, should
prefer the Situ project runtime directory rather than the selected checkout or
managed worktree. The command, useful stdout/stderr, and artifact path should be
recorded as measurement evidence when they matter. Scratch logs are runtime
artifacts, not candidate source changes, and should not make the user's selected
workspace dirty.

When a project workspace is nested inside a larger Git repository, Situ should
distinguish the managed worktree root from the nested workspace path given to
workspace tools. Reusing an experiment worktree must resolve the actual Git
worktree root and then derive the nested workspace path from the original
workspace's relative path; it must not append the relative path twice.

Situ should capture final worktree state for an experiment task even when the
Scientist pass fails. Failed experiments are still evidence: the dirty files,
partial patch, and command context explain what happened and help the Manager
decide whether to retry, abandon, or hand off more research.

Baseline, planning, interpretation, and review work may still inspect the
selected workspace directly. Candidate code edits, project-native commands, and
worker execution for an experiment task should happen in the experiment
worktree.

The default fresh-session launch should also reject dirty Git-backed
workspaces before opening the TUI or creating product records. This keeps users
from answering onboarding questions only to discover at the first candidate
experiment that isolation cannot begin from the selected checkout.

A complete promotion or cleanup workflow is out of scope. Accepted
candidates are inspected from their worktree path; rejected candidates
remain as disposable local checkouts.
Lineage-aware portfolio search extends this by making candidate code states
durable bases for later experiments without applying them to the user's
selected checkout; see
[0015-experiment-lineage-portfolio-search/SPEC.md](../0015-experiment-lineage-portfolio-search/SPEC.md).

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
- Creating managed worktrees for Scientist `experiment` tasks.
- Running experiment-task workspace tools and workers inside the managed
  worktree.
- Keeping command scratch logs in Situ runtime artifact paths rather than
  dirtying the selected checkout.
- Reusing existing managed worktrees correctly when the selected workspace is a
  nested path under the Git root.
- Recording final worktree state for successful and failed experiment tasks.
- Failing an experiment task before execution when the base workspace is dirty
  or not a Git repo.

## Deferred

- Promotion of accepted candidates back into the user's selected checkout.
- Automatic cleanup of completed or abandoned managed worktrees.
- A full branch manager that commits, resets, stashes, cherry-picks, or merges
  on behalf of the user.
- Sandboxed virtualenv recreation per experiment.
- Docker or containerized execution.
- Perfect language-aware classification of changed files.
- A standalone WorkspaceState database model.

## Product Rule

Situ should not only show that tests passed. It should show which workspace
state made them pass and whether that state is comparable to the baseline.
