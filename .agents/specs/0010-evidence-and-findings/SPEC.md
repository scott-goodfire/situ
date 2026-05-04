# Evidence And Findings

## Purpose

The first slice should not reduce autoresearch output to one best metric.
Autoresearch often learns through many experiments whose value appears in
patterns, combinations, failures, and suspicious evidence.

This spec defines the minimal model for evidence and findings.

## Evidence

Evidence is what came back from an experiment.

It can include:

- Scalar metrics
- Eval suite outputs
- Slice-level results
- Pass/fail checks
- Latency or cost
- Logs
- Diffs
- Artifacts
- Failure traces
- Human-readable notes

Evidence can be messy. The harness should preserve it without forcing every
piece into a single numeric metric.

## Signals

Signals are structured observations extracted from evidence.

Examples:

- `val_bpb = 2.84`
- `resolution_rate = 0.64`
- `latency_ms = 2410`
- `billing_slice = pass`

Some runs may have one obvious hill-climbing signal. Others may have several
signals that trade off against each other. The product should support both.

## Findings

A finding is a concise, evidence-backed claim about what the run appears to have
learned.

First-slice finding shape:

```text
id
summary
evidence_experiment_ids
confidence: low | medium | high
status: open | supported | contradicted
```

Examples:

- `Retrieval filtering helps cancellation tickets in 3/4 runs.`
- `The large improvement in exp_004 is suspicious because eval scope changed.`
- `A+C looks promising, but C explains most of the observed lift.`

## Product Rule

Findings should be lightweight and evidence-backed. Do not build a full research
knowledge graph, direction board, or variant model in the first slice.
