---
name: codebase-map
description: Use when a Researcher needs an understanding pass over an unfamiliar local project before hypotheses or experiments.
---

# Codebase Map

## Method

1. Read the assigned task with `get_task(task_id=...)`.
2. Inspect project docs first, then implementation files.
3. Identify the project-native setup, measurement command, candidate-edit surface, and invalid comparison surfaces.
4. Create an `Analysis` for reusable understanding.
5. Link the task to the Analysis and mark the task done.

## Include

- Important files and their roles.
- Measurement command and output shape.
- Safe candidate-edit surface.
- Files that should not be edited during candidate experiments.
- Obvious knobs for future hypotheses.
- Missing context or setup blockers.
