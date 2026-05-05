# Activities And Artifacts

## Purpose

The first slice should not reduce autoresearch output to one best metric.
Autoresearch often learns through many experiments whose value appears in
patterns, combinations, failures, and suspicious results.

This spec defines the minimal model for comment activities and artifacts.

## Activity

An activity is a timestamped, human-readable entry attached to a hypothesis, an
experiment, or an evaluation.

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
target_id        (NOT NULL, hypothesis_id / experiment_id / evaluation_id per table)
actor
kind: comment
body
payload_json
created_at
```

Activities do not carry a `session_id` column. The session is reached through
the parent (hypothesis, experiment, or evaluation), which is itself
session-required.

The body should be useful to humans. The payload can carry structured details
for agents and views, such as `activity_type: result` or `activity_type:
concern`, but the product model should not expose many activity kinds yet.

## Results

Results are usually evaluation activities written through the
`add_evaluation_result` tool.

They can include scalar metrics, pass/fail checks, slice-level outputs,
latency/cost, logs, artifact references, or failures. Do not force every result
into a single numeric metric.

When a result comes from a mutable workspace, it should carry or reference the
workspace state that made it interpretable: eval command, branch, commit, dirty
state, changed paths, and coarse changed-path categories.

Experiment activities can summarize what a result means for the attempted
change, but repeated benchmark runs, raw stdout/stderr, and reproduction notes
belong on the evaluation activity trail.

## Concerns

Concerns are comment activities that make suspicious or invalid results
explicit. They most often attach to evaluations, because evaluations are where
the evidence arrives.

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

## Evaluations

An evaluation is the lightweight container for measurement evidence. It exists
so baseline, candidate, reproduction, sanity, and blocked setup evidence do not
have to be stuffed into experiment comments.

First-slice evaluation shape:

```text
id
session_id                 (NOT NULL, FK -> sessions)
title
summary
status: open | active | closed
associated_experiment_id?
created_at
updated_at
```

First-slice evaluation activity shape:

```text
id
evaluation_id              (NOT NULL, FK -> evaluations)
actor
kind: comment
body
payload_json
created_at
```

Multiple runs of the same measurement should normally be multiple
evaluation activities under one evaluation. Create another evaluation only when
the measurement thread itself changes enough that it deserves a separate card,
such as a dedicated reproduction track.

Baseline measurement should be represented as an evaluation without an
associated experiment. Candidate and reproduction measurements should usually
link to the experiment they measure.

## Artifacts

Artifacts are receipts that sessions, objectives, hypotheses, experiments, or
activities can reference.

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
session_id              (NOT NULL, FK -> sessions)
associated_entity_kind
associated_entity_id
kind
title
path
media_type?
size_bytes?
created_at
```

Artifacts always belong to a session. Use the generic associated entity
fields instead of a widening set of nullable foreign keys. This keeps the
record understandable without forcing the first slice to predict every
artifact attachment target.

## Product Rule

Keep the activity model small and LLM-friendly. Do not build a full research
knowledge graph, direction board, variant model, or specialized finding/warning
tables in the first slice.
