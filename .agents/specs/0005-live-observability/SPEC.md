# Live Observability

Live observability is the core first-slice product object.

It answers:

> What is running, what changed, what did the eval say, what looks suspicious,
> and what is the current best valid result?

Do not model this as a broad health score yet. The first TUI should show live
facts clearly.

## Observability Summary

The TUI should make these immediately visible:

- Goal
- Run status
- Baseline metric
- Current active experiment
- Current best valid result
- Recent experiments
- Basic warnings
- Event timeline

## Current Best Valid Result

The best valid result is the best completed experiment that:

- Has a numeric primary metric.
- Did not fail eval execution.
- Did not trigger the slim guardrails.
- Improves according to the configured metric direction.

Suspicious results can still be shown, but they must be excluded from the best
valid result.

## Warnings

Warnings are simple and concrete:

- Eval failed.
- Primary metric missing.
- Primary metric non-numeric.
- Forbidden path changed.

The first UI should not hide these behind a health score.

## Product Rule

The terminal dashboard is the output. Do not add a final report until the live
observability surface is useful.
