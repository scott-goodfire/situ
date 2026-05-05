# Activities And Artifacts

## Purpose

The first slice should not reduce autoresearch output to one best metric.
Autoresearch often learns through many experiments whose value appears in
patterns, combinations, failures, and suspicious results.

This spec defines the minimal model for comment activities and artifacts.

## Activity

An activity is a timestamped, human-readable entry attached to either a
hypothesis or an experiment.

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
target_id
session_id?
actor
kind: comment
body
payload_json
created_at
```

The body should be useful to humans. The payload can carry structured details
for agents and views, such as `activity_type: result` or `activity_type:
concern`, but the product model should not expose many activity kinds yet.

## Results

Results are experiment comment activities.

They can include scalar metrics, pass/fail checks, slice-level outputs,
latency/cost, logs, artifact references, or failures. Do not force every result
into a single numeric metric.

## Concerns

Concerns are experiment comment activities that make suspicious or invalid
results explicit.

Examples:

- `Expected signal "score" was missing.`
- `Result shape changed from baseline.`
- `Eval failed before producing metrics.`
- `Large score improvement needs reproduction.`

Concerns replace the standalone warning model in the first slice. They should be
distinguishable through body text and optional payload metadata rather than a
separate database status or activity kind.

## Interpretations

Interpretations and lightweight findings should be written as comment activities
rather than a standalone Finding model.

Examples:

- `A improved over baseline, but only on the easy slice.`
- `A+C looks promising; C explains most of the observed lift.`
- `The large improvement in exp_004 is suspicious because eval scope changed.`

## Artifacts

Artifacts are receipts that sessions, objectives, hypotheses, experiments, or
activities can reference.

They can include:

- Raw eval JSON
- Logs
- Diffs
- Patches
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
objective_id
associated_session_id?
associated_entity_kind
associated_entity_id
kind
title
path
media_type?
size_bytes?
created_at
```

Use the generic associated entity fields instead of a widening set of nullable
foreign keys. This keeps the record understandable without forcing the first
slice to predict every artifact attachment target.

## Product Rule

Keep the activity model small and LLM-friendly. Do not build a full research
knowledge graph, direction board, variant model, or specialized finding/warning
tables in the first slice.
