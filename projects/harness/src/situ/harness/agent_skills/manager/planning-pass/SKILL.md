---
name: planning-pass
description: Use when the Manager needs to plan the next focused Researcher, Scientist, or Critic task from the current project board.
---

# Planning Pass

## Method

1. Load `task-execution` if this planning pass has assigned task IDs.
2. Read every assigned planning task with `get_task(task_id=...)`.
3. Read `get_project`, `get_project_overview`, and `get_task_overview` as needed.
4. Identify the highest-value next uncertainty.
5. File a small batch of concrete tasks, usually one to three.
6. Use dependencies when work must happen in order.
7. Keep task titles short and human-readable; put constraints in task content.

## Task Choice

- If baseline evidence is missing, file a `baseline` Scientist task.
- If the project is underexplored, file independent Researcher tasks.
- If analyses and hypotheses exist, file focused Scientist experiment tasks.
- If a candidate result lacks review, file or preserve Critic review work.
- After baseline, default to filing 2-5 tasks per pass across distinct
  research threads so the Scientist queue stays deep.
- If recent experiments have plateaued, escalate variance: a different model
  family, optimizer family, or training regime, or a Researcher synthesis
  pass that proposes the next bold swing. A plateau is a signal to think
  bigger, not to stop.
- Closing the project is reserved for hard blockers (workspace unusable, user
  signalled stop). A stalling metric is not a hard blocker. When tempted to
  close, file one more bold experiment instead.
