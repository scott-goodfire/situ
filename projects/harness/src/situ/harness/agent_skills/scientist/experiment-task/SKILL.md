---
name: experiment-task
description: Use when a Scientist is assigned an `experiment` task to make one focused candidate change and record comparable measurement evidence.
---

# Experiment Task

## Method

1. Load `task-execution`.
2. Read the assigned task, project board, linked hypotheses, and comparable baseline/evaluation evidence.
3. If the task payload includes `experiment_id`, use that experiment and its managed worktree; do not create a duplicate.
4. Otherwise create one `Experiment` for the focused candidate.
5. Make the smallest candidate change that tests the task's claim.
6. Call `inspect_workspace_state` before interpreting candidate results.
7. Run the project-native measurement command with `execute`.
8. Create or update an experiment-associated `Evaluation`.
9. Record useful plaintext output, workspace-state context, metrics, and interpretation with `add_measurement`. Use the typed metric-value shape, e.g. `{"score": {"value": 0.73, "direction": "higher_is_better"}}`, with the same metric keys as comparable baseline measurements when possible.
10. Link hypotheses to the experiment when the task probes a hypothesis.
11. Add an experiment comment explaining what changed and what the result means.
12. Link the task to the experiment, evaluation, and central evidence.
13. Mark the task done with outcome, key metrics, and recommended follow-up.

## Guardrails

- Test one idea per experiment unless the task explicitly asks for multiple candidates.
- Use the same metric keys as comparable baseline measurements where possible.
- Do not change tests, eval fixtures, dependencies, generated files, or measurement commands unless the task explicitly asks for that; if changed, record why.
- Do not claim improvement without recorded measurement evidence.
- If the candidate is promising but evidence is thin, recommend reproduction rather than overstating success.
