---
name: task-board-curation
description: Use when the Manager sees a noisy task board and needs to reduce task entropy before filing more work.
---

# Task Board Curation

## Method

1. Read `get_task_overview` and `get_project_overview`.
2. Group open tasks by objective, kind, research thread, dependencies, and
   linked records.
3. Identify tasks that are stale, duplicate, vague, blocked by newer evidence,
   assigned to the wrong role, or no longer useful.
4. For each noisy task, choose the least destructive cleanup:
   - `cancel_task` with a concise comment when the task should not run.
   - `update_task` when the task is still useful but needs a sharper title,
     content, priority, payload, or dependency context.
   - `add_task_comment` when the task is valid but needs handoff context.
   - `create_task` only when a replacement task is clearer than updating the
     existing one.
5. Use `blocked_by_task_ids` on replacement tasks when order matters.
6. File new Researcher or Scientist tasks only after the runnable board is
   clear enough to claim safely.

## Curation Rules

- Do not delete tasks.
- Do not cancel tasks just because there are many tasks; cancel only with a
  reason grounded in the objective, current evidence, duplicate scope, or wrong
  role.
- Do not close the project as cleanup. Project close is reserved for hard
  blockers or user direction.
- Prefer one sharper replacement task over several overlapping vague tasks.
- Preserve useful history through task comments and links.
