---
title: Guardrails
status: active
---

# Policy: Guardrails

## Applies To

Experiment execution, evidence ingestion, diff inspection, warning display, and
finding support.

## Rule

In the first slice, "guardrails" means automated trust checks. They should be
concrete enough to protect findings and evidence summaries from relying on
obviously invalid evidence without requiring the user to predeclare every risk.

## Required Checks

- Experiments record warning/suspicious outcomes alongside evidence and signals.
- Eval failure, missing expected signals, signal shape changes, and measurement
  artifact changes are detectable in the MVP path when possible.
- Suspicious evidence is excluded from supported findings until explicitly
  resolved or corroborated.
- Suspicious reasons are visible in the TUI.

## Red Flags

- Accepting the best metric result without checking whether the eval changed.
- Treating suspicious results as ordinary failures without explanation.
- Keeping guardrail information only in logs.
- Requiring the user to enumerate every forbidden behavior before any automated
  checks exist.
- Expanding to a complex policy engine before the slim automated checks work.
