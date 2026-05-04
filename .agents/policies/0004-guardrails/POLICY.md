---
title: Guardrails
status: active
---

# Policy: Guardrails

## Applies To

Experiment execution, result ingestion, diff inspection, warning display, and
best-valid-result calculation.

## Rule

Guardrails should be slim and concrete in the first slice. They exist to keep
the current best valid result from accepting obviously invalid experiments.

## Required Checks

- Experiments record warning/suspicious outcomes alongside primary metrics.
- Eval failure, missing metric, non-numeric metric, and forbidden path changes
  are detectable in the MVP path.
- Suspicious wins are excluded from the best valid result until explicitly
  resolved.
- Suspicious reasons are visible in the TUI.

## Red Flags

- Accepting the best metric result without checking whether the eval changed.
- Treating suspicious results as ordinary failures without explanation.
- Keeping guardrail information only in logs.
- Expanding to a complex policy engine before the slim checks work.
