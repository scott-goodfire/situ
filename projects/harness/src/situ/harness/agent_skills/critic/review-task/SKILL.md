---
name: review-task
description: Use when a Critic is assigned a `review` task to evaluate whether a completed experiment is decision-grade.
---

# Review Task

## Method

1. Load `task-execution`.
2. Read the assigned review task with `get_task(task_id=...)`.
3. Use the task payload and task entity links to identify the experiment and central evidence.
4. Read the project board plus focused experiment, evaluation, measurement, activity, artifact, and workspace-state records as needed.
5. Use read-only workspace tools only to inspect candidate files or diffs; do not edit files or run candidate experiments.
6. Write exactly one `add_experiment_review` unless the task is blocked.
7. Link the task to the experiment and central evidence records when missing.
8. Mark the task done with verdict and recommended next step.

## Review Bar

- Check whether claimed improvements are supported by recorded measurements.
- Check comparability: command, interpreter/toolchain, tests, fixtures, dependencies, generated files, dirty state, and result shape.
- Look for seed hacking, cherry-picked runs, noisy selection, and adaptive overfitting.
- Prefer `needs_reproduction` when evidence is promising but thin.
- Use `invalid` when the evidence cannot support the claimed result.
- Use `human_review` when the next decision needs user judgment rather than another autonomous task.
