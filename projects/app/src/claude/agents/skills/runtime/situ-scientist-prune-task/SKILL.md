---
name: situ-scientist-prune-task
description: Use for Situ Scientist ResearchTasks with type prune: evidence-backed branch pruning without new experiment execution.
---

# Situ Scientist Prune Task

Use this skill when the active ResearchTask type is `prune`.

Prune tasks preserve search quality by explaining why a branch should stop.
They should be evidence-backed and should not create new candidate work.

## Procedure

1. Read the active ResearchTask with `get_research_task`.
2. Inspect the branch with `search_research_tasks`, `search_hypotheses`,
   `search_experiments`, `search_evaluations`, `list_measurements`,
   `list_artifacts`, and `list_entity_links`.
3. Identify the specific evidence: failed verification, duplicated hypothesis,
   weak metric, invalid comparison, plateaued result, or blocked requirement.
4. Create an artifact or entity link only when it helps preserve the pruning
   rationale. If you create an artifact, put the concise rationale in the
   artifact `body`: short bullets, evidence ids, and the stop reason. The path
   is optional for inline rationale artifacts.
5. Submit the ResearchTask with `submit_research_task_for_verification`.

## Tool Boundaries

Allowed tools are durable reads plus `create_artifact`, `create_entity_link`,
and `submit_research_task_for_verification`. Pruning report artifacts should
include a short markdown-like `body` with the evidence and stop reason; inline
rationales do not need a real file path.

Do not call `run_readonly_workspace_command`, `run_workspace_command`, create
new candidate experiments, or record new measurements for a prune task. If
pruning requires new empirical evidence, call `fail_research_task` and explain
that the Manager should create an `explore` or `exploit` task instead.
Do not create new candidate experiments from a prune task.
