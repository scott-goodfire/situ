---
name: task-execution
description: Use when any Situ runtime agent is assigned task IDs and needs the common task read, record, link, and completion procedure.
---

# Task Execution

## Method

1. Read every assigned task with `get_task(task_id=...)`.
2. Use the returned task content, payload, dependencies, links, and comments as the focus for this pass.
3. Read `get_project_overview` or focused `list_*` tools only when the task needs that context.
4. Load a task-kind skill when one matches the task kind.
5. Produce durable Situ records for findings, hypotheses, baselines, experiments, evaluations, measurements, or reviews.
6. Link the task to important produced or referenced records with `link_task_entity` when the role has that tool.
7. Add a short task comment only when it improves the handoff.
8. Call `complete_task` with a short result summary when the focused work is complete.

## Completion Rules

- Do not silently switch to another task in the same pass.
- Do not paste a project board into task comments.
- Do not mark a task done if the required evidence or record writes failed.
- If the task is stale, duplicate, irrelevant to the project objective, superseded by newer evidence, assigned to the wrong role, or no longer worth doing, call `cancel_task` with a concise comment explaining why.
- If the task was valid but execution failed, required context is unavailable, or required evidence cannot be produced, call `fail_task` with a concise comment explaining the blocker.
- Result summaries should say what durable records were created and what the next agent should do.
