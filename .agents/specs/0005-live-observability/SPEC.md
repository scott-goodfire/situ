# Live Observability

Live observability is the core first-slice product object.

It answers:

> What is running, which hypotheses are active, what experiments are being tried,
> what activity came back, what looks suspicious, and what is the system
> learning?

Do not model this as a broad health score yet. The first TUI should show live
facts clearly.

## Observability Summary

The TUI should make these immediately visible:

- Objective
- Session status
- Evaluation context
- Active hypotheses
- Current active experiment
- Recent experiments
- Recent result activities
- Recent concern activities
- Recent interpretation/decision activities
- Artifact references when useful
- Internal event timeline

## Activities First

The first slice should make activities visible. Activities are compact,
typed, human-readable entries attached to hypotheses or experiments.

Examples:

- `result: baseline score 0.710, latency 100ms`
- `concern: score improved sharply but result shape changed`
- `update: A+C looks promising, but C explains most of the lift`
- `decision: keep retrieval hypothesis active; pause prompt-ordering thread`

Best observed signal can still be shown when meaningful, but it is supporting
context rather than the central product object.

## Concerns

Concerns are simple and concrete activities:

- Evaluation failed.
- Expected signal missing.
- Signal shape changed.
- Evaluation artifact changed unexpectedly.
- Suspiciously large improvement needs corroboration.

The first UI should not hide these behind a health score.

## Product Rule

The terminal dashboard is the output. Do not add a final report until the live
observability surface is useful.
