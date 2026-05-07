---
name: planning-pass
description: Use when the Manager needs to plan the next focused Researcher, Scientist, or Critic task from the current project board.
---

# Planning Pass

## Method

1. Load `task-execution` if this planning pass has assigned task IDs.
2. Read every assigned planning task with `get_task(task_id=...)`.
3. Read `get_project`, `get_project_board`, and `get_task_board` as needed.
4. Identify the highest-value next uncertainty.
5. File a small batch of concrete tasks, usually one to three.
6. Use dependencies when work must happen in order.
7. Keep task titles short and human-readable; put constraints in task content.

## Task Choice

- If baseline evidence is missing, file a `baseline` Scientist task.
- If the project is underexplored, file independent Researcher tasks.
- If analyses and hypotheses exist, file focused Scientist experiment tasks.
- If a candidate result lacks review, file or preserve Critic review work.
- If closing seems tempting, use the close handshake and keep going unless no useful work remains.
