# Guardrails

In the first slice, "guardrails" means automated trust checks.

They protect interpretation activities from obvious invalidity. The user should
not have to manually enumerate every forbidden behavior before Almanac can
notice suspicious results.

## Current Trust Checks

The current slice should catch obvious issues without requiring the user to
enumerate everything up front:

- Evaluation failed.
- Expected signal is missing.
- Signal type or shape changed.
- Evaluation or measurement artifacts changed unexpectedly.
- Sample count or eval scope changed unexpectedly when detectable.
- Result improved suspiciously much without corroborating context.

## Suspicious Results

A suspicious result is experiment activity that should not be treated as
trustworthy support without review or corroboration.

When this happens:

- Keep the result activity.
- Record a concern activity on the experiment.
- Preserve artifact references.
- Explain the reason in plain language.
- Show the concern in the TUI.

## Product Rule

Metric movement is not enough. The dashboard must distinguish observed results
from trustworthy interpretation.
