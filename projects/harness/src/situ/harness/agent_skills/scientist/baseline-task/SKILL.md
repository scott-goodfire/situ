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
6. Create or select a `Baseline`.
7. Create a baseline-associated `Evaluation`.
8. Record useful plaintext command output and interpretation with `add_evaluation_result`.
9. Put comparable values in `payload.metrics` using stable metric keys when possible.
10. Link the task to the baseline, evaluation, and central measurement evidence.
11. Mark the task done with the command, headline metrics, and comparability caveats.

## Guardrails

- Do not edit project source files for a baseline.
- Do not treat a failed setup command as a successful baseline.
- Preserve dirty-start, branch, commit, dependency, and eval-command context when it affects comparability.
- If no valid measurement command can be found, mark the task failed or blocked with the reason.
