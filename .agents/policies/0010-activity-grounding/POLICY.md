---
title: Activity Grounding
status: active
---

# Policy: Activity Grounding

## Applies To

Hypothesis activities, experiment activities, evaluation activities, result
summaries, concern panels, agent-readable context, and any future
interpretation extraction logic.

## Rule

Activities should be grounded in experiments, hypotheses, evaluations, and
artifacts. They should summarize what happened or what the system believes, not
invent durable conclusions without inspectable support.

## Required Checks

- Result activities link to the evaluation that recorded the measurement.
- Candidate evaluation results link back to the experiment they measured when
  there is an associated experiment.
- Hypothesis interpretation activities cite relevant experiments, activities, or
  artifacts when possible.
- Concern activities clearly explain what looks suspicious or invalid.
- Activities are concise enough to scan in the TUI.
- Activities can describe combinations and interactions without requiring a
  first-class Variant model.

## Red Flags

- An interpretation activity with no clear experiment, activity, or artifact
  basis.
- A result activity that hides suspicious context.
- A concern that is only visible in raw logs.
- An activity system that becomes a complex knowledge graph before the current
  loop is useful.
