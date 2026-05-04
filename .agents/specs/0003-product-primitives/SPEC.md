# Product Primitives

Use simple product nouns. For the first slice, keep the domain intentionally
small.

## MVP Hierarchy

```text
Goal
  |-- Runs
  |     |-- Experiments
  |     |-- Evidence
  |     |-- Findings
  |     `-- Events
  `-- Warnings
```

## Goal

The durable north star. It defines what the research is trying to improve or
understand.

A first goal needs goal text plus a lightweight evaluation context: how progress
is judged, what signals matter, and what kinds of experiments are in scope.

## Evaluation Context

A plain-language description of how progress is judged.

It can include commands, tools, dashboards, metrics, eval suites, logs, cluster
jobs, notebooks, or human review criteria. Do not require the user to reduce
this to one command or one metric during onboarding.

## Experiment

One concrete attempt: a change, probe, eval run, analysis, or test.

An experiment should record:

- Hypothesis
- Intent or method summary
- Status
- Components/tags for what was tried
- `based_on` links when it combines prior experiments
- Evidence
- Suspicious flag and reason
- Short note
- Minimal log/artifact references if available

Do not add `Variant` as a first-class model yet. Use experiment tags,
components, and `based_on` links to express baseline + A, baseline + B, A + C,
or partial-C style combinations.

## Evidence

What came back from an experiment.

Evidence can include scalar metrics, pass/fail checks, slice-level results,
latency/cost, diffs, logs, artifacts, notes, or failures.

## Signal

A specific observed value inside evidence.

Examples:

- `val_bpb = 2.84`
- `resolution_rate = 0.64`
- `latency_ms = 2410`
- `cancellation_slice_passed = true`

Signals and evals are related; do not force a single primary signal in the first
product slice.

## Finding

A lightweight, evidence-backed statement about what the run appears to have
learned.

A finding should link to one or more experiments and carry a confidence/status
small enough for the TUI to show.

## Event

A timestamped record of what happened during the run.

Events power the TUI timeline. They should be concise enough to scan.

## Warning

A live observability note that something may be invalid or needs attention.

Examples:

- Evaluation failed.
- Expected signal missing.
- Signal shape changed.
- Evaluation artifact changed unexpectedly.
- Suspiciously large improvement needs corroboration.

## Deferred Primitives

These remain important product concepts, but are not part of the first
implementation slice:

- Direction
- Decision
- Report
- Broad health model
