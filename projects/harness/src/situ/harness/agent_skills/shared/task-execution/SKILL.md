---
name: task-execution
description: Use when any Situ runtime agent is assigned task IDs and needs the common task read, record, link, and completion procedure.
---

# Task Execution

## Method

1. Read every assigned task with `get_task(task_id=...)`.
2. Use the returned task content, payload, dependencies, links, and comments as the focus for this pass.
3. Read `get_project_board` or focused `list_*` tools only when the task needs that context.
4. Load a task-kind skill when one matches the task kind.
5. Produce durable Situ records for findings, hypotheses, baselines, experiments, evaluations, measurements, or reviews.
6. Link the task to important produced or referenced records with `link_task_entity` when the role has that tool.
7. Add a short task comment only when it improves the handoff.
8. Mark the task done with `update_task(status="done", ...)` when the focused work is complete.

## Completion Rules

- Do not silently switch to another task in the same pass.
- Do not paste a project board into task comments.
- Do not mark a task done if the required evidence or record writes failed.
- If blocked, leave a concise task comment and mark the task failed or abandoned according to the task state available to the role.
- Result summaries should say what durable records were created and what the next agent should do.
