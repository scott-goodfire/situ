# Experiment Lineage And Portfolio Search

## Purpose

Situ should be able to support autoresearch loops that improve over time
without forcing every accepted candidate into the user's selected checkout or
collapsing the search into one greedy champion branch.

This spec defines the product contract for experiment lineage: candidate
experiments can become durable parents for later experiments, and the Manager
can allocate work across several research threads.

## Product Thesis

Karpathy-style autoresearch advances by keeping useful candidate code states
and discarding weak ones. That creates momentum: future experiments start from
what worked instead of always returning to the original repo state.

Situ needs that compounding behavior, but with two additional constraints:

- The user's selected checkout must remain protected unless the user explicitly
  asks to export, apply, merge, or open a PR.
- The loop should avoid a single global champion that greedily hill-climbs into
  a local maximum.

The product shape is a portfolio of experiment lineages:

```text
repo base
  -> optimizer thread
       -> accepted candidate
       -> reproduction candidate
       -> combined schedule candidate
  -> architecture thread
       -> rejected attention change
       -> accepted depth/width change
  -> regularization thread
       -> tentative small gain
```

The user should be able to answer:

> What candidate state did this experiment start from, what candidate state did
> it produce, which research thread is it part of, and why did the loop continue,
> fork, reproduce, or abandon that path?

## Lineage Contract

An experiment may participate in a lineage. The minimum durable facts are:

- The base commit or code state used to create the experiment workspace.
- The candidate commit or code state produced by the experiment, when the
  experiment changed code.
- The parent experiment, when this experiment deliberately builds on a previous
  candidate.
- A research-thread label that groups related attempts, such as optimizer,
  architecture, regularization, data curriculum, systems speed, reproduction,
  or ablation.

These facts belong on or near the experiment because they define the candidate
change being evaluated. They should not be inferred only from worktree paths,
task titles, timestamps, or activity prose.

Lineage is intentionally lighter than a full branch manager. Situ does not need
a first-class Variant, Direction, Branch, Promotion, or Champion model for this
contract.

## Candidate State

Candidate experiments should produce a durable inspectable code state when they
make source changes. In Git-backed workspaces, that should be a commit or other
stable Git ref reachable from Situ-managed local state.

Recording only a dirty worktree is enough for first-slice observability but not
enough for compounding autoresearch. Future experiments need a stable base to
branch from, and users need a stable object to inspect, diff, export, or
discard later.

Creating the candidate state must not update the user's selected checkout,
default branch, or `main` branch. Internal candidate commits are research
artifacts until the user explicitly exports or applies them.

When a candidate commit exists, Situ should create a patch handoff artifact for
the diff from the experiment base to that candidate. The patch artifact answers
"where did the useful code go?" without silently merging it. Readiness is still
derived from Critic review and Manager lineage decisions; a patch can be
captured before it is ready to apply.

## Base Selection

The default base for a new experiment should be chosen by Manager planning, not
hard-coded to the original repo `HEAD`.

Valid bases include:

- The original clean workspace commit.
- A previous experiment's candidate state.
- An older ancestor that is useful for ablation or escaping a local maximum.
- A reproduced candidate state.
- A deliberately independent base for exploration.

Experiment tasks that ask for code changes should be able to carry the chosen
base information in structured payload. The harness should prepare the managed
worktree from that chosen base and record the base on the experiment.

Agents should choose bases through a small structured selector rather than
inventing Git-like labels. The Manager may choose the selected checkout, a
parent experiment candidate, or an explicit Git commit/ref. Only the explicit
Git-ref path should use `base_commit`; arbitrary unknown base strings should
fail visibly rather than silently falling back to another commit.

If the chosen base cannot be resolved, the experiment should fail before the
Scientist mutates code, and the failure should be visible as task and
experiment activity.

## Portfolio Search

The Manager should treat active lineages as a portfolio, not a single ranked
leaderboard.

On each planning pass, it should consider:

- Which research threads exist and what each has learned.
- Which candidates are promising enough to continue.
- Which candidates need reproduction before further descendants.
- Which threads are stale, overfit, noisy, or stuck.
- Whether the next step should exploit a promising thread, explore an
  independent thread, reproduce a suspicious result, fork from an older
  ancestor, or abandon a path.

The runtime does not need true parallel execution to support portfolio search.
Sequential sessions can still keep multiple active fronts by choosing different
thread/base pairs over time.

The first policy can be simple:

- Keep a small number of active research threads when the project is not yet
  exhausted.
- Avoid spending the entire remaining budget on one thread solely because it
  has the current best metric.
- Require reproduction or Critic review before building many descendants from a
  large or suspicious gain.
- Periodically return to baseline or an older stable ancestor when a thread is
  producing small noisy improvements.
- Abandon a thread after repeated non-improving descendants unless the thread
  is still strategically useful.

## Decisions As Activities

Situ should not add a broad promotion-status enum as the first implementation
step. Continuation, rejection, reproduction, and abandonment decisions should be
recorded as activities with structured payload.

Useful decision activity metadata includes:

```text
activity_type: lineage_decision
decision: continue | fork | reproduce | abandon | reject
research_thread
parent_experiment_id
base_commit
candidate_commit
reason
critic_review_activity_id?
```

The body should explain the decision in human terms. The payload exists so
agents and views can reconstruct lineage behavior without parsing prose.

An experiment's latest lineage decision can be derived from activities. Do not
add duplicated status fields until querying or enforcement requires them.

## Critic Role

The Critic reviews the experiment as the proposed change, as defined in
[0010-activities-and-artifacts](../0010-activities-and-artifacts/SPEC.md) and
[0013-agent-task-coordination](../0013-agent-task-coordination/SPEC.md).

For lineage-aware sessions, the Critic should also comment on whether the
candidate is a sound base for further work:

- Does the result look reproducible enough to continue this thread?
- Is the improvement likely to be selection on noise?
- Did the candidate change the measurement or evaluation surface?
- Is the change a useful simplification even if the metric is flat?
- Should the Manager reproduce, fork, abandon, or continue from this state?

The Critic does not have to choose the next experiment. It records review
evidence and recommendations. The Manager allocates the next portfolio step.

## TUI Shape

The terminal surface shows lineage compactly. Full Git-visualizer shapes
are out of scope.

Useful views:

- Experiments grouped by research thread.
- Parent/child relationship when one experiment builds on another.
- Base and candidate commit/ref for each candidate.
- Patch handoff artifact when a candidate diff was captured.
- Latest Critic verdict and latest lineage decision.
- Thread-level hints such as promising, needs reproduction, stale, or
  abandoned, derived from activities.

The TUI should make it clear that these are Situ-managed candidate states, not
changes applied to the user's selected checkout.

## In Scope

- Recording experiment parentage.
- Recording research-thread labels on experiments or experiment tasks.
- Recording stable candidate commits/refs for code-changing experiments.
- Recording patch artifacts for code-changing candidate experiments.
- Preparing experiment worktrees from a selected base, not only the selected
  checkout's current `HEAD`.
- Letting Manager planning choose whether to continue, fork, reproduce,
  abandon, or restart from baseline.
- Recording lineage decisions as experiment or task activities.
- Showing lineage and thread context in agent-facing project state and the TUI.

## Deferred

- Automatically merging, cherry-picking, or applying candidates into the user's
  selected checkout.
- Creating GitHub pull requests from accepted candidates.
- A single global champion pointer.
- A first-class Branch, Variant, Direction, Promotion, or Review model.
- True parallel experiment execution across multiple GPUs or workers.
- Automatic cleanup or garbage collection of old candidate refs and worktrees.
- Sophisticated search algorithms, bandits, Bayesian optimization, or RL.
- Cross-project lineage transfer.

## Review Criteria

- A future experiment can deliberately branch from a previous experiment's
  candidate state.
- Candidate state is durable enough for later worktree creation and user
  inspection.
- Code-changing candidates have an inspectable patch artifact before any human
  apply/export step.
- The user's selected checkout is not mutated by autonomous candidate
  continuation.
- The Manager can keep more than one active research thread alive.
- Critic reviews inform whether a candidate is safe to continue from, but do
  not silently become hidden promotion state.
- Lineage decisions are visible as activities with human-readable reasoning.
- The product does not introduce champion, variant, branch-manager, or PR
  concepts before the core portfolio-search loop requires them.
