# Task Work Types And Reviews

## Purpose

Situ tasks should help humans and agents understand how to think about a piece
of work, not only which agent can claim it.

This spec defines task work types and target-specific Critic reviews. It narrows
the task coordination contract from
[0013-agent-task-coordination](../0013-agent-task-coordination/SPEC.md) and the
activity contract from
[0010-activities-and-artifacts](../0010-activities-and-artifacts/SPEC.md).

## Product Thesis

Autoresearch coordination needs two layers of task meaning:

- The coordination lane: who can claim the task and which lifecycle rules
  apply.
- The semantic frame: what kind of thinking the task asks for, which rubric or
  runtime skill applies, and how the task should appear in live observability.

`TaskKind` owns the coordination lane. A task work type owns the semantic
frame.

For example, a task that asks the Critic to review a hypothesis is still a
`review` task, because the Critic claims it and review lifecycle rules apply.
Its work type is `review_hypothesis`, so the task board and agent trace can
read like "Review hypothesis" rather than a generic "Review".

## Task Work Type

A task may carry a `work_type` in addition to its `kind`.

The task kind defines broad workflow behavior:

- `plan` tasks are Manager planning work.
- `research`, `hypothesize`, and `interpret` tasks are Researcher work.
- `baseline` and `experiment` tasks are Scientist work.
- `review` tasks are Critic work.

The work type defines a more specific mental model inside that workflow lane.
It is stable enough for display, skill dispatch, and review, but it should not
be used to create a second task lifecycle when the `kind` lifecycle is enough.

Work types must not contradict task kinds. A `review_hypothesis` task is a
`review` task and is claimed by the Critic. It is not Researcher work, because
its purpose is to independently check a hypothesis rather than create or refine
one.

When a task has no work type, the task is understood by its kind, title,
content, payload, and links.

## Review Work Types

Review tasks are Critic-owned checks of durable research work before the system
treats that work as decision-grade.

The active review work types are:

- `review_experiment` checks whether a completed candidate experiment has
  trustworthy evidence before the Manager replans from it.
- `review_hypothesis` checks whether a hypothesis is testable, grounded,
  distinct enough, and clear enough to guide empirical work.

Review work types share one product shape:

```text
durable record exists
  -> review task names that record
  -> Critic claims the review task
  -> Critic reads the task and target record through tools
  -> Critic writes a target-owned review activity
  -> Critic marks the review task done
  -> Manager reads the review before trusting the target
```

The review task is the visible request for independent judgment. The review
activity is the durable judgment. Hooks, events, or automated checks may create
or annotate review tasks, but hidden semantic review is out of scope.

## Review Assignment Payload

A review task payload names its main reviewed object with a direct entity ID
field:

```text
hypothesis_id
experiment_id
evaluation_id
analysis_id
```

Secondary context uses `associated_<entity>_id` or
`associated_<entities>_ids`:

```text
associated_task_id
associated_baseline_id
associated_evaluation_ids
associated_measurement_ids
associated_artifact_ids
```

The main reviewed object should be obvious from the work type and direct ID
field. Normal review tasks should not use generic fields such as
`review_target_kind`, `review_target_id`, or `evidence_ids`.

Examples:

```json
{
  "kind": "review",
  "work_type": "review_hypothesis",
  "payload": {
    "hypothesis_id": "H7",
    "associated_task_id": "T12"
  }
}
```

```json
{
  "kind": "review",
  "work_type": "review_experiment",
  "payload": {
    "experiment_id": "EX4",
    "associated_task_id": "T18",
    "associated_evaluation_ids": ["EV3"],
    "associated_measurement_ids": ["M9", "M10"]
  }
}
```

Payload context is assignment context, not a copied evidence bundle. The task
title and content explain why the review exists when that is useful. Durable
relationships to research records should also be represented with task entity
links when the relationship matters for querying or rendering.

## Context Acquisition

The Critic should acquire context through explicit tools rather than receiving a
large prefilled state blob.

A review pass starts from the assigned task ID. The Critic reads the task, then
uses target-specific readers, activity readers, task links, and project/task
board readers as needed.

For a hypothesis review, useful context includes:

- the hypothesis record;
- hypothesis activities;
- linked or nearby analyses;
- existing active hypotheses;
- linked experiments, if any;
- the associated source task, when present;
- the objective and research context from project state.

For an experiment review, useful context includes:

- the experiment record;
- experiment activities;
- associated evaluations and measurements;
- workspace-state observations;
- artifacts such as command receipts, logs, and patches;
- linked hypotheses;
- the associated Scientist task, when present.

The trace should show the Critic reading the records it uses before writing a
review. Prior chat history or task payload should not replace these reads.

## Review Activities

A Critic review is a target-owned activity. A separate first-class Review or
Verification model is out of scope.

Experiment reviews attach to experiments. Hypothesis reviews attach to
hypotheses. Future analysis or evaluation reviews should attach to their
natural parent records if those work types become part of the active product
surface.

The review body should explain what the Critic checked, what looks trustworthy
or weak, and what should happen next. Payload metadata may include:

```text
activity_type: critic_review
work_type
verdict
concern_kinds
associated_task_id
associated_evaluation_ids
associated_measurement_ids
recommended_next_step
```

The payload supports rendering and agent context. The activity body remains the
primary human-readable review.

Verdicts are intentionally lightweight. Useful review verdicts include:

- `usable`
- `concern`
- `invalid`
- `needs_more_evidence`
- `needs_reproduction`
- `human_review`

Each work type may use the subset that fits its target. For example,
`needs_reproduction` is natural for experiment evidence and usually not the
right vocabulary for a hypothesis review.

## Hypothesis Reviews

A hypothesis review checks readiness for empirical work. It does not prove the
hypothesis true.

A `review_hypothesis` task checks whether the hypothesis is:

- testable;
- grounded in analysis, measurement, codebase evidence, user context, or prior
  activity;
- distinct enough from existing active hypotheses;
- clear about expected evidence or a plausible experiment shape;
- careful about uncertainty and overclaiming.

The Critic may mark a hypothesis usable with caveats, request revision,
recommend human review, or flag it as too vague, duplicative, or unsupported.

The Manager should prefer reviewed hypotheses when filing Scientist experiment
tasks. If the Manager files an experiment from an unreviewed hypothesis, the
task content should make that choice visible.

## Experiment Reviews

An experiment review checks whether a candidate experiment can shape the next
research decision.

`review_experiment` follows the experiment review contract in
[0010-activities-and-artifacts](../0010-activities-and-artifacts/SPEC.md) and
[0013-agent-task-coordination](../0013-agent-task-coordination/SPEC.md). It
checks whether the recorded measurements support the claimed result, whether
the evidence is comparable to baseline, and whether the candidate has trust
concerns such as changed evals, changed dependencies, noisy selection, seed
hacking, or suspicious result shape changes.

The Manager should not replan from a completed candidate experiment as
decision-grade until a Critic experiment review exists or the lack of review is
made visible as a limitation.

## Runtime Skills

Review methodology belongs in Critic runtime skills. The Critic should load a
review method that matches the task work type, such as `review-hypothesis` or
`review-experiment`, before writing the review activity.

Runtime skills describe the method and rubric. They do not replace Situ tools.
Durable findings still flow through explicit record reads and target-owned
review activities.

## TUI Shape

Live task surfaces should prefer the work type when it clarifies the task.

Useful task labels include:

```text
Review hypothesis H7
Review experiment EX4
```

The TUI should still show the broader task kind when that helps users
understand who owns the work. A compact task card can show both:

```text
review / review_hypothesis
```

Review activities should appear in the target record's activity trail, so a
user inspecting a hypothesis or experiment can see the Critic's judgment in
context.

## In Scope

- Optional task work types as semantic frames for tasks.
- `review_hypothesis` and `review_experiment` as active Critic work types.
- Direct main ID fields such as `hypothesis_id` and `experiment_id` in review
  task payloads.
- `associated_*` payload fields for secondary context.
- Task entity links for durable relationships to reviewed or considered
  research records.
- Target-owned Critic review activities.
- Critic context acquisition through explicit tools and runtime skills.
- TUI labels that show the work type when it is clearer than the broad task
  kind.

## Deferred

- A standalone `Review` or `Verification` model.
- Separate task kinds such as `review_hypothesis` or `review_experiment`.
- Mandatory Critic review for every analysis, hypothesis, task, or comment.
- Hidden semantic review inside Pydantic AI hooks or observability callbacks.
- Generic `evidence_ids` payload bundles as the normal review context shape.
- Review work types for every possible record before hypothesis and experiment
  reviews are useful in the live loop.

## Review Criteria

- Task kinds remain bounded workflow lanes.
- Work types make task cards and agent traces more semantically legible.
- Review tasks clearly name their main target with a direct entity ID field.
- Secondary review context uses `associated_*` names.
- Critic review is visible as a task plus a target-owned activity, not hidden in
  logs, hooks, or chat history.
- The Critic reads task and research records through tools before writing
  semantic judgment.
- Review outputs stay concise, human-readable, and grounded in inspectable
  records or artifacts.
