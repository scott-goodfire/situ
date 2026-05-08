---
name: baseline-task
description: Use when a Scientist is assigned a `baseline` task to establish project-native measurement evidence before candidate experiments.
---

# Baseline Task

## Method

1. Load `task-execution`.
2. Read the assigned task and project board.
3. Inspect the workspace and project docs to identify the project-native measurement command.
4. Call `inspect_workspace_state` before interpreting the baseline.
5. Run the measurement command with `execute`.
6. Create or select an active `Baseline`.
7. Read existing baseline context with `list_baseline_activities` when reusing
   a baseline record.
8. Create an active baseline-associated `Evaluation`.
9. Record useful plaintext command output and interpretation with `add_measurement`.
10. Put comparable values in `payload.metrics` using stable metric keys and the typed metric-value shape, e.g. `{"score": {"value": 0.73, "direction": "higher_is_better"}}`. Direction may be `higher_is_better`, `lower_is_better`, `target`, or `informational`.
11. Call `submit_baseline` to hand the finished baseline to the Critic for evidence vetting (active -> in_review).
12. Call `submit_evaluation` for the associated evaluation.
13. Link the task to the baseline, evaluation, and central measurement evidence.
14. Call `complete_task` with the command, headline metrics, and any comparability issues noted.

## Guardrails

- Do not edit project source files for a baseline.
- Do not treat a failed setup command as a successful baseline.
- Preserve dirty-start, branch, commit, dependency, and eval-command context when it affects comparability.
- If no valid measurement command can be found, mark the task failed or blocked with the reason.
- Call `submit_baseline` (not `complete_baseline`) when your work is done; the Critic finalizes via `complete_baseline` after vetting.
- When creating new baseline or evaluation records for this task, use `status="active"` so `submit_baseline` and `submit_evaluation` can hand them to review.
- Measurement prose can use basic Markdown for compact metric bullets, fenced
  output snippets, or small tables. Keep the interpretation in sentences around
  the numbers.
