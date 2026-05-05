# Activities And Artifacts

## Purpose

The first slice should not reduce autoresearch output to one best metric.
Autoresearch often learns through many experiments whose value appears in
patterns, combinations, failures, and suspicious results.

This spec defines the minimal model for typed activities and artifacts.

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
kind: comment | update | result | concern | decision
body
payload_json
created_at
```

The body should be useful to humans. The payload can carry structured details
for agents and views.

## Results

Results are experiment activities.

They can include scalar metrics, pass/fail checks, slice-level outputs,
latency/cost, logs, artifact references, or failures. Do not force every result
into a single numeric metric.

## Concerns

Concerns are activities that make suspicious or invalid results explicit.

Examples:

- `Expected signal "score" was missing.`
- `Result shape changed from baseline.`
- `Eval failed before producing metrics.`
- `Large score improvement needs reproduction.`

Concerns replace the standalone warning model in the first slice.

## Interpretations

Interpretations and lightweight findings should be written as activities rather
than a standalone Finding model.

Examples:

- `A improved over baseline, but only on the easy slice.`
- `A+C looks promising; C explains most of the observed lift.`
- `The large improvement in exp_004 is suspicious because eval scope changed.`

## Artifacts

Artifacts are receipts that activities can reference.

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

## Product Rule

Keep the activity model small and LLM-friendly. Do not build a full research
knowledge graph, direction board, variant model, or specialized finding/warning
tables in the first slice.
