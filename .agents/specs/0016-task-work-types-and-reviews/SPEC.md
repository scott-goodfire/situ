# Task Types And Reviews

## Purpose

Situ tasks help humans and agents understand the shape of work, who can claim
it, and which records it reviews or produces.

This spec defines task type semantics and target-specific Critic reviews. It
narrows the task coordination contract from
[0013-agent-task-coordination](../0013-agent-task-coordination/SPEC.md), the
activity contract from
[0010-activities-and-artifacts](../0010-activities-and-artifacts/SPEC.md), and
the workflow-state contract from
[0019-pull-based-workflow-state](../0019-pull-based-workflow-state/SPEC.md).

## Product Thesis

Autoresearch coordination uses visible work items and visible judgments. A task
is the work item. A target-owned recorded activity is the durable judgment.
The runtime poller reads statuses, links, dependencies, and recorded facts to
derive the next runnable task.

## Task Type

A task exposes a bounded semantic type that tells the runtime and UI how to
route, display, and prompt the work.

Task types include:

- `plan`
- `research`
- `hypothesize`
- `baseline`
- `experiment`
- `interpret`
- `review_analysis`
- `review_hypothesis`
- `review_baseline`
- `review_experiment`
- `review_evaluation`

The type determines the eligible agent lane:

- Manager: `plan`
- Researcher: `research`, `hypothesize`, `interpret`
- Scientist: `baseline`, `experiment`
- Critic: `review_*`

An implementation may expose type as a single field or as a broad kind plus a
more specific work type. The product contract is that each task has one clear
semantic frame for routing, display, runtime skill selection, and review.

## Task Status

Task statuses follow
[0019-pull-based-workflow-state](../0019-pull-based-workflow-state/SPEC.md):

```text
triage
backlog
in_progress
done
canceled
failed
```

Triage is the intake lane. A task in triage needs acceptance, cancellation,
merge, refinement, or routing before normal execution. Accepting a task moves
it to backlog. Canceling a task moves it to canceled. Each status transition
records a `status_updated` activity on the task.

## Review Tasks

Review tasks are Critic-owned checks of durable records before those records
become decision-grade project context.

Review task types map to the record being checked:

- `review_analysis` checks whether an analysis is grounded, useful, and scoped
  enough to guide later work.
- `review_hypothesis` checks whether a hypothesis is concrete, testable,
  grounded, and distinct enough to guide empirical work.
- `review_baseline` checks whether baseline evidence is usable for comparison.
- `review_experiment` checks whether a candidate experiment's evidence is
  trustworthy enough to shape planning.
- `review_evaluation` checks whether a measurement thread is clear,
  comparable, and sufficiently evidenced.

Review tasks share one runtime shape:

```text
target record reaches a reviewable state
  -> poller exposes or creates a review task
  -> Critic claims the review task
  -> Critic reads the task, target, activities, measurements, artifacts, and links
  -> Critic records a review result on the target
  -> Critic completes, cancels, or fails the review task
```

## Review Assignment Payload

A review task payload names its main reviewed object with a direct target ID
field:

```text
analysis_id
hypothesis_id
baseline_id
experiment_id
evaluation_id
```

Secondary context uses `associated_<entity>_id` or
`associated_<entities>_ids` fields when useful:

```text
associated_task_id
associated_baseline_id
associated_evaluation_ids
associated_measurement_ids
associated_artifact_ids
associated_review_activity_id
```

The task title and content explain why the review exists when that context is
useful. Durable relationships to reviewed or considered records are represented
with task entity links.

## Review Result Activity

A Critic review result is a target-owned `recorded` activity:

```text
kind: recorded
record_type: review_result
decision: accepted | changes_requested | rejected | inconclusive
review_task_id
findings
reviewed_analysis_ids?
reviewed_hypothesis_ids?
reviewed_baseline_ids?
reviewed_experiment_ids?
reviewed_evaluation_ids?
reviewed_measurement_ids?
reviewed_artifact_ids?
```

The activity body reads like a concise review: what evidence was checked, what
is trustworthy or weak, and what the judgment means for the record. The payload
supports rendering, polling, and agent context.

Findings carry:

```text
code
summary
blocking?
severity?
evidence_ids?
artifact_ids?
```

Review results describe the record and its evidence. Pull-based routing derives
follow-up work from the decision, findings, record status, links, and
unresolved activity state.

## Pull-Derived Feedback

Review feedback is task-shaped and derived from recorded facts.

Useful pull derivations include:

- A triaged analysis with no review result can produce a `review_analysis`
  task when the project needs Critic judgment before accepting it.
- A triaged hypothesis with no review result can produce a
  `review_hypothesis` task before empirical work depends on it.
- An active or accepted experiment with measurement evidence and no later
  review result can produce a `review_experiment` task.
- A review result with `accepted` can move the target record to accepted or
  done when the target's evidence is complete enough for the project.
- A review result with `changes_requested` and unresolved blocking findings can
  produce a focused producer-lane task linked to the review activity.
- A review result with `inconclusive` and unresolved missing-evidence findings
  can produce evidence-gathering, measurement, or interpretation work.
- A review result with `rejected` can move the target to canceled or support a
  recorded lineage or resolution decision.

Follow-up tasks link to the review activity they address. A later done task,
new review result, status transition, resolution, or lineage decision can make
the earlier finding resolved for polling purposes.

## Context Acquisition

The Critic acquires context through explicit tools.

A review pass starts from the assigned task ID. The Critic reads the task,
target record, target activities, task links, nearby analyses, measurements,
artifacts, and project overview as needed. The trace should show the Critic
reading the records it uses before recording a review result.

For experiment reviews, useful context includes the experiment record,
experiment activities, evaluations, measurements, workspace-state observations,
patch or command artifacts, linked hypotheses, and the producing Scientist
task.

For hypothesis reviews, useful context includes the hypothesis record,
hypothesis activities, linked or nearby analyses, active hypotheses, linked
experiments, and the producing or associated task.

For analysis, baseline, and evaluation reviews, useful context includes the
record body, related activities, measurements where present, artifacts, linked
tasks, and project objective/research context.

## Bounded Iteration

Review-driven iteration is bounded by visible statuses and links. A repeated
review cycle needs materially new evidence, a status transition, or a task that
addresses the prior review result. If the same blocking finding remains
unresolved, the poller surfaces that unresolved state and keeps duplicate
review work bounded.

Task status carries work outcome. `canceled` is the graceful stop for work that
is intentionally out of the runnable queue. `failed` is for attempted work that
could not complete because of setup, evidence, tool, or execution failure.

Record status carries record outcome. Hypothesis resolution, experiment
lineage, trust findings, and review decisions are recorded facts on the natural
target records.

## TUI Shape

Live task surfaces show the task type when it clarifies the work:

```text
review_analysis
review_hypothesis
review_experiment
```

Review tasks appear in the same triage, backlog, in-progress, done, canceled,
and failed lanes as other tasks. Review result activities appear on the target
record's timeline.

## Out of Scope

- Standalone Review, ReviewRequest, Verification, Warning, Finding, or
  PullRequest models.
- Human-dependent review states.
- Prescriptive next-action fields on review result payloads.
- Approval quorums, required reviewers, merge queues, cycles, estimates,
  labels, and team collaboration workflows.

## Review Criteria

- A review is visible as a task before or while the Critic works.
- A review judgment is visible as a target-owned `recorded` activity with
  `record_type: review_result`.
- Review decisions use `accepted`, `changes_requested`, `rejected`, or
  `inconclusive`.
- Follow-up work is derived from unresolved statuses, findings, links, and
  recorded facts.
- Review tasks and follow-up tasks link to the records and activities they
  review or address.
- Critic traces show explicit reads before judgment.
