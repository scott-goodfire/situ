# Guardrails

In the first slice, "guardrails" means automated trust checks.

They protect findings and evidence summaries from obvious invalidity. The user
should not have to manually enumerate every forbidden behavior before Almanac can
notice suspicious evidence.

## MVP Trust Checks

The MVP should catch obvious issues without requiring the user to enumerate
everything up front:

- Evaluation failed.
- Expected signal is missing.
- Signal type or shape changed.
- Evaluation or measurement artifacts changed unexpectedly.
- Sample count or eval scope changed unexpectedly when detectable.
- Result improved suspiciously much without corroborating evidence.

## Suspicious Results

A suspicious result is evidence that cannot be trusted as support for a finding
without review or corroboration.

When this happens:

- Mark the experiment suspicious.
- Keep the evidence in the ledger.
- Exclude it from supported findings until resolved.
- Explain the reason.
- Show the warning in the TUI.

## Product Rule

Metric movement is not enough. The dashboard must distinguish observed evidence
from trustworthy evidence.
