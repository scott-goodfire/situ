# Live Observability

Live observability is the core product object.

It answers:

> What is running, which hypotheses are active, what experiments are being tried,
> what activity came back, what looks suspicious, and what is the system
> learning?

Live observability is not a broad health score. The TUI shows live facts
clearly; aggregated health scoring is out of scope.

## Observability Summary

The TUI should make these immediately visible:

- Objective
- Session status
- Research context
- Active hypotheses
- Current active experiment
- Recent experiments
- Recent result comments
- Recent concern comments
- Recent interpretation/decision comments
- Artifact references when useful
- Internal event timeline

## Activities First

Activities are visible. They are compact, comment-shaped, human-readable
entries attached to hypotheses or experiments.

Examples:

- `baseline score 0.710, latency 100ms`
- `concern: score improved sharply but result shape changed`
- `A+C looks promising, but C explains most of the lift`
- `decision: keep retrieval hypothesis active; pause prompt-ordering thread`

Best observed signal can be shown as supporting context when meaningful.

## Concerns

Concerns are simple and concrete comments:

- Evaluation failed.
- Expected signal missing.
- Signal shape changed.
- Evaluation artifact changed unexpectedly.
- Suspiciously large improvement needs corroboration.

The UI does not hide these behind a health score.

## Product Rule

The terminal dashboard is the output. A final report is out of scope until
the live observability surface is useful on its own.
