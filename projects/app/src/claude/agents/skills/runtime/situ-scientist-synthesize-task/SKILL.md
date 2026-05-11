---
name: situ-scientist-synthesize-task
description: Use for Situ Scientist ResearchTasks with type synthesize: legible reports and evidence summaries without command execution or file mutation.
---

# Situ Scientist Synthesize Task

Use this skill when the active ResearchTask type is `synthesize`.

Synthesize tasks make durable evidence legible. They summarize verified state,
create report artifacts, and link evidence for downstream readers.

## Procedure

1. Read the active ResearchTask with `get_research_task`.
2. Inspect durable context with `search_research_tasks`, `search_hypotheses`,
   `search_baselines`, `search_experiments`, `search_evaluations`,
   `list_measurements`, `list_artifacts`, and `list_entity_links`.
3. Summarize only evidence that exists in durable records. Distinguish verified
   findings from open questions.
4. Create a report artifact with `create_artifact`. Put the concise report
   text in the artifact `body`: short sections, evidence ids, and plain
   next-step language. Link it with `entityKind` and `entityId`; use
   `researchTaskId` only for explicit ResearchTask ownership. The path is
   optional for inline report artifacts.
5. Link the report, task, baseline, experiment, evaluation, or measurement
   records with `create_entity_link`.
6. Submit the ResearchTask with `submit_research_task_for_verification`.

## Tool Boundaries

Allowed tools are durable reads plus `create_artifact`, `create_entity_link`,
and `submit_research_task_for_verification`. Report artifacts should include a
short markdown-like `body` that captures the evidence-backed synthesis; inline
reports do not need a real file path.

Do not call `run_readonly_workspace_command`, `run_workspace_command`,
`capture_experiment_candidate`, or compute-target tools. Do not mutate
repository files from a synthesize task.
Do not call command tools while writing a synthesis report.

If the workerPrompt asks for new experiments or command execution, call
`fail_research_task` and explain that the task type should be `exploit` or
`debug`.
