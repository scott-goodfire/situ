---
name: interpret-task
description: Use when a Scientist is assigned an `interpret` task that requires empirical comparison of baselines, experiments, evaluations, and measurements.
---

# Scientist Interpret Task

## Method

1. Load `task-execution`.
2. Read the assigned task, project board, and focused measurement/evaluation lists.
3. Compare baseline and experiment evidence using recorded metrics and plaintext outputs.
4. Create or update an `Analysis` only when the interpretation should persist beyond the task summary.
5. Add comments to experiments or evaluations only when they capture durable empirical judgment.
6. Link the task to the interpreted records and any produced Analysis.
7. Mark the task done with the empirical conclusion, uncertainty, and next recommended action.

## Guardrails

- Do not run a new candidate experiment from an interpret task unless the task explicitly asks for reproduction or remeasurement.
- Do not infer metrics that were not recorded.
- Mention comparability concerns before recommending that Manager build on a result.
