# Activities And Artifacts

## Purpose

The first slice should not reduce autoresearch output to one best metric.
Autoresearch often learns through many experiments whose value appears in
patterns, combinations, failures, and suspicious results.

This spec defines the minimal model for comment activities, measurement
evidence, and artifacts.

## Activity

An activity is a timestamped, human-readable entry attached to a hypothesis, an
experiment, an evaluation, a measurement, or another inspectable ledger record
when useful.

It can describe:

- A comment
- A status update
- A plan
- A result
- A concern
- A decision
- An interpretation
- A link to an artifact

First-slice activity shape:

```text
id
target_id        (NOT NULL, per activity table or associated entity fields)
created_in_session_id?
actor
kind: comment
body
payload_json
created_at
```

Activities should not be session-owned. The session that created an activity can
be stored as optional `created_in_session_id` provenance. Ownership reaches the
project through the parent ledger record.

The body should be useful to humans. The payload can carry structured details
for agents and views, such as `activity_type: result` or `activity_type:
concern`, but the product model should not expose many activity kinds yet.

## Measurements And Results

A measurement is one concrete observed result under an evaluation. It is the
model-level home for command output, workspace-state context, metric bundles,
artifact references, failures, and concern metadata.

Measurements can include scalar metrics, pass/fail checks, slice-level outputs,
latency/cost, logs, artifact references, or failures. Do not force every
measurement into a single numeric metric.

When a measurement comes from a mutable workspace, it should carry or reference
the workspace state that made it interpretable: eval command, branch, commit,
dirty state, changed paths, and coarse changed-path categories.

Experiment activities can summarize what a measurement means for the attempted
change, but repeated benchmark runs, raw stdout/stderr, and reproduction notes
belong on the measurement trail. In the current implementation, evaluation
result activities are the closest storage shape to measurements; future model
work should make the measurement concept explicit before adding a rigid metric
table.

## Concerns

Concerns are human-readable entries that make suspicious or invalid results
explicit. They most often attach to measurements or evaluations, because that is
where the evidence arrives.

Examples:

- `Expected signal "score" was missing.`
- `Result shape changed from baseline.`
- `Eval failed before producing metrics.`
- `Large score improvement needs reproduction.`
- `Candidate changed tests/evals, so the passing test count is not directly
  comparable to baseline.`
- `Candidate includes dependency changes; environment comparability needs
  review.`

Concerns replace the standalone warning model in the first slice. They should
be distinguishable through body text and optional payload metadata rather than a
separate database status or activity kind.

## Interpretations

Interpretations and lightweight findings should be written as comment activities
rather than a standalone Finding model.

Examples:

- `A improved over baseline, but only on the easy slice.`
- `A+C looks promising; C explains most of the observed lift.`
- `The large improvement in exp_004 is suspicious because eval scope changed.`

## Critic Reviews

A Critic review is an experiment activity that treats the experiment as the
proposed change and the associated evaluations/measurements as evidence. It is
not a separate first-class Review model in the current slice.

The body should read like a concise PR review: what evidence was considered,
what looks trustworthy or suspicious, and what should happen next. The payload
may include stable review metadata while the shape is still evolving:

```text
activity_type: critic_review
verdict: usable | concern | invalid | needs_reproduction | human_review
reviewed_evaluation_ids
reviewed_measurement_ids
concern_kinds
recommended_next_step
```

If the Critic finds a specific trust problem, it may also write a concern-shaped
experiment activity or include concern metadata in the review payload. Raw
command output and repeated runs should remain on measurements; the review is
the judgment over the proposed change.

## Evaluations

An evaluation is the lightweight container for measurement evidence. It exists
so baseline, candidate, reproduction, sanity, and blocked setup evidence do not
have to be stuffed into experiment comments.

First-slice evaluation shape:

```text
id
project_id                 (NOT NULL, FK -> projects)
created_in_session_id?
title
summary
status: open | active | closed
associated_baseline_id?
associated_experiment_id?
created_at
updated_at
```

Exactly one measured subject should be associated: either
`associated_baseline_id` or `associated_experiment_id`. Do not infer baseline
meaning from a missing experiment association.

Baseline and experiment records may each have many evaluations. Each evaluation
may have many measurements. Use separate evaluations for distinct checks, such
as a primary benchmark, reproduction track, latency smoke, or human review.

Measurement shape:

```text
id
evaluation_id              (NOT NULL, FK -> evaluations)
created_in_session_id?
actor
body
payload_json
created_at
```

Multiple runs of the same evaluation should normally be multiple measurements
under one evaluation. Create another evaluation only when the measurement thread
itself changes enough that it deserves a separate card, such as a dedicated
reproduction track.

Baseline measurement should be represented as an evaluation associated with a
baseline. Candidate and reproduction measurements should usually link to the
experiment they measure.

Comparisons should be derived from compatible measurements, not stored as metric
values on the baseline itself. A candidate measurement may cite the baseline
measurement or aggregate it was compared against in `payload_json`, along with
metric deltas or a human-readable comparison summary. When multiple baseline
measurements exist, the payload or nearby activity should make the selection or
aggregation rule visible.

Metric observations in `payload_json` should use a typed object shape under
stable metric keys, such as `metrics.score.value`, with optional unit,
direction, and notes metadata. Keep metric definitions inside the measurement
payload until they need their own query surface or lifecycle.

## Artifacts

Artifacts are receipts that projects, sessions, analyses, hypotheses,
baselines, experiments, evaluations, measurements, or activities can reference.

They can include:

- Raw eval JSON
- Logs
- Diffs
- Patches
- Git status snapshots
- Screenshots
- Trace exports
- Dataset slices
- Generated samples
- Reproduction bundles

Activities explain what happened. Artifacts preserve the thing that can be
inspected later.

First-slice artifact shape:

```text
id
project_id              (NOT NULL, FK -> projects)
created_in_session_id?
associated_entity_kind
associated_entity_id
kind
title
path
media_type?
size_bytes?
created_at
```

Artifacts always belong to a project. Use the generic associated entity fields
instead of a widening set of nullable foreign keys. This keeps the record
understandable without forcing the first slice to predict every artifact
attachment target.

## Product Rule

Keep the activity model small and LLM-friendly. Do not build a full research
knowledge graph, direction board, variant model, or specialized finding/warning
tables in the first slice.
