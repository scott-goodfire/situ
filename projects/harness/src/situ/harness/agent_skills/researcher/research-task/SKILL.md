---
name: research-task
description: Use when a Researcher is assigned a `research` task for codebase understanding, external context, error analysis, or exploratory synthesis.
---

# Research Task

## Method

1. Load `task-execution`.
2. Read the task with `get_task(task_id=...)`.
3. Read `get_project_board` and focused record lists needed for the task.
4. Inspect local files with read-only workspace tools when local context matters.
5. Use web search only when external context would materially improve the synthesis.
6. Create or update an `Analysis` for reusable understanding.
7. Link the task to the Analysis and any central supporting records.
8. Mark the task done with a concise summary of the reusable finding and recommended next task kind.

## Good Output

- The Analysis separates observed local facts from interpretation.
- External sources include names and URLs when used.
- Candidate experiment ideas are concrete enough for a future task, but broad notes stay in Analysis.
- Hypotheses are created only when the claim is testable and ready for a Scientist handoff.
