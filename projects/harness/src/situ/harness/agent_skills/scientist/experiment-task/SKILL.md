---
name: experiment-task
description: Use when a Scientist is assigned an `experiment` task to make one focused candidate change and record comparable measurement evidence.
---

# Experiment Task

## Method

1. Load `task-execution`.
2. Read the assigned task, project board, linked hypotheses, and comparable
   baseline/evaluation evidence.
3. If the task has no linked hypotheses and no `payload.hypothesis_ids`, call
   `fail_task`; candidate experiments need a testable hypothesis.
4. If the task payload includes `experiment_id`, use that experiment and its
   managed worktree; do not create a duplicate.
5. Otherwise create one `Experiment` for the focused candidate.
6. Make the smallest candidate change that tests the task's claim.
7. Call `inspect_workspace_state` before interpreting candidate results.
8. Run the project-native measurement command with `execute`.
9. Create or update an active experiment-associated `Evaluation`.
10. Record useful plaintext output, workspace-state context, metrics, and
    interpretation with `add_measurement`. Use the typed metric-value shape,
    e.g. `{"score": {"value": 0.73, "direction": "higher_is_better"}}`, with
    the same metric keys as comparable baseline measurements when possible.
11. Verify the experiment is linked to every hypothesis named by the task.
12. Add an experiment comment explaining what changed and what the result means.
13. Call `submit_experiment` to hand the finished experiment to the Critic for
    evidence vetting (active -> in_review).
14. Call `submit_evaluation` for each associated evaluation that is ready for
    review.
15. Link the task to the experiment, evaluation, and central evidence.
16. Call `complete_task` with outcome, key metrics, and a brief note on what a
    follow-up pass should do.

## Guardrails

- Test one idea per experiment unless the task explicitly asks for multiple candidates.
- Use the same metric keys as comparable baseline measurements where possible.
- Do not change tests, eval fixtures, dependencies, generated files, or measurement commands unless the task explicitly asks for that; if changed, record why.
- Do not claim improvement without recorded measurement evidence.
- After a hard timeout or command failure that produces no comparable metrics,
  do not spend additional replicate runs on the same candidate. Record the
  failed measurement, run only cheap diagnostics needed to explain the blocker,
  and submit or fail the experiment according to the evidence.
- If the candidate is promising but evidence is thin, recommend reproduction rather than overstating success.
- Call `submit_experiment` (not `complete_experiment`) when your work is done; the Critic finalizes via `complete_experiment` after vetting.
- When creating new experiment records for this task, use `status="active"` so `submit_experiment` can hand them to review.
- When creating new evaluation records for this task, use `status="active"` so `submit_evaluation` can hand them to review.
- Measurement and experiment comments can use basic Markdown for compact metric
  bullets, fenced output snippets, or small tables. Keep the interpretation in
  sentences around the numbers.
