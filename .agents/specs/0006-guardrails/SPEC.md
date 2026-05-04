# Guardrails

Guardrails are intentionally slim for the first slice. They protect the current
best valid result from obvious invalidity.

## MVP Guardrails

The MVP should catch only obvious issues:

- Eval command exits nonzero.
- Primary metric is missing.
- Primary metric is not numeric.
- Forbidden path changed.

## Suspicious Results

A suspicious result is an experiment that cannot be trusted as the current best
valid result.

When this happens:

- Mark the experiment suspicious.
- Exclude it from best valid result.
- Explain the reason.
- Show the warning in the TUI.

## Product Rule

Metric improvement is not enough. The dashboard must distinguish best raw metric
from best valid result.
