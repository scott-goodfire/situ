# Live Observability

Live observability is the core first-slice product object.

It answers:

> What is running, what changed, what did the eval say, what looks suspicious,
> and what is the run learning?

Do not model this as a broad health score yet. The first TUI should show live
facts clearly.

## Observability Summary

The TUI should make these immediately visible:

- Goal
- Run status
- Evaluation context
- Baseline evidence when available
- Current active experiment
- Recent experiments
- Recent evidence/signals
- Lightweight findings
- Basic warnings
- Event timeline

## Findings First

The first slice should make lightweight findings visible. A finding is a compact
claim backed by experiment evidence.

Examples:

- `F-003: Retrieval filtering helps cancellation tickets in 3/4 runs.`
- `F-004: Optimizer beta sweeps look saturated for this setup.`
- `F-005: A + C looks promising, but C explains most of the lift.`

Best observed signal can still be shown when meaningful, but it is supporting
context rather than the central product object.

## Warnings

Warnings are simple and concrete:

- Evaluation failed.
- Expected signal missing.
- Signal shape changed.
- Evaluation artifact changed unexpectedly.
- Suspiciously large improvement needs corroboration.

The first UI should not hide these behind a health score.

## Product Rule

The terminal dashboard is the output. Do not add a final report until the live
observability surface is useful.
