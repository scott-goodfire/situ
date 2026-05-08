---
name: review-hypothesis
description: Use when a Critic review task has work_type `review_hypothesis` and needs to evaluate whether a hypothesis is ready for empirical work.
---

# Review Hypothesis

A hypothesis review checks readiness for experimentation. It does not prove
the hypothesis is true. It checks whether the hypothesis is concrete,
testable, grounded, and worth running an experiment against.

## Method

1. Load `task-execution`.
2. Read the assigned review task with `get_task(task_id=...)`.
3. Use the task payload and task entity links to identify the hypothesis.
4. Read the hypothesis, its activity trail with
   `list_hypothesis_activities`, related analyses, and any prior review
   activities.
5. Inspect the project board for related hypotheses and recent activity to
   judge novelty and overlap.
6. Write exactly one `add_hypothesis_review` unless the task is blocked.
   Pass the assigned task id as `review_task_id` so the routing layer can
   tie the review activity to this task.
7. Link the task to the hypothesis and any analyses that were central to the
   review.
8. Mark the task done with verdict and recommended next step.

## Review Bar

- Concreteness: the hypothesis names a measurable change or a specific claim
  that an experiment could be designed against.
- Grounding: the hypothesis is supported by observed evidence, prior
  analysis, or stated assumptions, not bare speculation.
- Distinguishability: the hypothesis is not a duplicate or trivial variant
  of an existing hypothesis without a meaningful new angle.
- Actionability: an experiment plan can be sketched without inventing
  missing context.
- Prefer `needs_more_evidence` when the hypothesis is plausible but the
  grounding is thin.
- Use `invalid` when the hypothesis is not testable, not measurable, or
  contradicts established results in the project.
- Use `human_review` when the next decision needs user judgment rather than
  another autonomous task.
