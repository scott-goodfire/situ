---
name: review-task
description: Use when a Critic is assigned a `review` task. Dispatches to the right review method based on the task `work_type`.
---

# Review Task

A Critic review task names a target record and a method via `work_type`.
Pick the matching method skill and follow it instead of writing the review
from scratch.

## Method

1. Load `task-execution`.
2. Read the assigned review task with `get_task(task_id=...)`.
3. Dispatch on the task `work_type`:
   - `review_hypothesis` -> load `review-hypothesis`.
   - `review_experiment` -> load `review-experiment`.
4. If `work_type` is missing or unrecognized, fall back to the entity-link
   shape: a `reviews` link to a hypothesis means hypothesis review, a
   `reviews` link to an experiment means experiment review.

## Shared Bar

- Read the target record and its activity trail before writing judgment.
- Write exactly one review activity unless the task is blocked.
- Link the review task to the records that were central to the review.
- Mark the review task done with a verdict and recommended next step.
- Use `human_review` when the next decision needs user judgment rather than
  another autonomous task.
