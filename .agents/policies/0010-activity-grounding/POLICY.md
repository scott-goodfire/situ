---
title: Activity Grounding
status: active
---

# Policy: Activity Grounding

## Applies To

Hypothesis activities, experiment activities, measurements, result summaries,
concern panels, agent-readable context, and any future
interpretation extraction logic.

## Rule

Activities and measurement evidence should be grounded in the product
relationships defined by
[`../../specs/0003-product-primitives/SPEC.md`](../../specs/0003-product-primitives/SPEC.md)
and the evidence/artifact rules in
[`../../specs/0010-activities-and-artifacts/SPEC.md`](../../specs/0010-activities-and-artifacts/SPEC.md).
They should summarize what happened or what the system believes, not invent
durable conclusions without inspectable support.

## Required Checks

- Measurement and activity records follow the ownership and relationship shape
  defined in the specs.
- Interpretation activities cite relevant ledger records or artifacts when
  possible.
- Concern activities clearly explain what looks suspicious or invalid.
- Activities are concise enough to scan in the TUI.
- Activities can describe nuanced findings without promoting deferred models
  that the specs still treat as activity-shaped.

## Red Flags

- An interpretation activity with no clear experiment, activity, or artifact
  basis.
- Measurement evidence that hides suspicious context.
- A concern that is only visible in raw logs.
- An activity system that becomes a complex knowledge graph before the current
  loop is useful.
