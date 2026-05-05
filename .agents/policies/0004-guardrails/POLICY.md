---
title: Guardrails
status: active
---

# Policy: Guardrails

## Applies To

Experiment execution, result ingestion, diff inspection, concern display, and
interpretation activities.

## Rule

In the first slice, "guardrails" means automated trust checks. They should be
concrete enough to prevent obviously invalid results from silently shaping
interpretation without requiring the user to predeclare every risk.

## Required Checks

- Experiments record suspicious or invalid outcomes as concern comments.
- Eval failure, missing expected signals, signal shape changes, and measurement
  artifact changes are detectable in the current path when possible.
- Suspicious results are visible before they can be treated as trusted
  interpretation.
- Concern reasons are visible in the TUI.

## Red Flags

- Accepting the best metric result without checking whether the eval changed.
- Treating suspicious results as ordinary failures without explanation.
- Keeping guardrail information only in logs.
- Requiring the user to enumerate every forbidden behavior before any automated
  checks exist.
- Expanding to a complex policy engine before the slim automated checks work.
