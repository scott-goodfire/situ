---
name: situ-scientist-explore-task
description: Use for Situ Scientist ResearchTasks with type explore: baseline discovery, repo understanding, and hypothesis exploration without candidate worktree edits.
---

# Situ Scientist Explore Task

Use this skill when the active ResearchTask type is `explore`.

Explore tasks widen understanding. They establish baselines, inspect the source
workspace, inspect existing evidence, or create testable hypotheses. They do
not open candidate experiment branches.

## Procedure

1. Read the active ResearchTask with `get_research_task`.
2. Search or list existing context first: `search_research_tasks`,
   `search_hypotheses`, `search_baselines`, `search_experiments`,
   `search_evaluations`, `list_measurements`, `list_artifacts`, and
   `list_entity_links`.
3. For repository discovery, use `run_readonly_workspace_command` with normal
   shell commands for listing, searching, reading, and repo-native baseline
   measurement on the unmodified source workspace.
   Put any temporary logs, metrics, or scratch output under
   `$SITU_COMMAND_OUTPUT_DIR`; do not write `run.log`, `results.tsv`, or similar
   files into the source workspace.
4. Create only the smallest relevant durable records:
   `create_hypothesis`, `create_baseline`, `create_evaluation`, and
   `record_measurement`. If the task produces a testable claim, write it as a
   Hypothesis instead of leaving it only in the ResearchTask summary.
   Keep titles natural and summaries compact: 1-2 sentences plus bullets when
   useful.
5. For baseline command evidence, require fresh parseable output from the
   current command. If the command fails, times out, produces no parseable
   metrics, or reports a read-only violation, do not reuse stale metrics or
   invent a baseline; record the missing evidence or call `fail_research_task`.
6. Use `create_artifact` and `create_entity_link` when baseline outputs, logs,
   files, hypotheses, or evaluations need durable links.
7. Move baseline and evaluation records through submit, complete, or fail tools
   only when the evidence justifies the status.
8. Submit the ResearchTask with `submit_research_task_for_verification`.

## Tool Boundaries

Allowed tools are durable read/search/list tools, `run_readonly_workspace_command`,
plus durable evidence tools for hypotheses, baselines, evaluations,
measurements, artifacts, and entity links.

Use `run_readonly_workspace_command` only for source workspace inspection,
baseline commands, or verification-style checks. Do not use it for candidate
edits or for writing report files. Do not redirect command output to files in
the source workspace; use `$SITU_COMMAND_OUTPUT_DIR` and then summarize or link
the durable evidence. If it reports `readOnlyViolation: true`, stop and call
`fail_research_task` with the changed files.

Do not use `run_workspace_command` or `capture_experiment_candidate` for a
normal explore task. Those tools belong to `exploit` or `debug` tasks. Do not
use `run_workspace_command` for normal baseline or hypothesis exploration.

If the workerPrompt requires candidate edits or experiment worktree execution,
stop and call `fail_research_task` with a concise mismatch reason instead of
improvising.
