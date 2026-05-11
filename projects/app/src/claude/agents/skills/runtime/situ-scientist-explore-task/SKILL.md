---
name: situ-scientist-explore-task
description: Use for situ Scientist ResearchTasks with type explore: baseline discovery, repo understanding, and hypothesis exploration without candidate capture.
---

# situ Scientist Explore Task

Use this skill when the active ResearchTask type is `explore`.

Explore tasks widen understanding. They establish baselines, inspect the source
workspace, inspect existing evidence, or create testable hypotheses. They do
not capture candidate experiment branches. They may use an isolated experiment
worktree when a baseline command needs writable workspace isolation or the
workerPrompt explicitly requires `run_workspace_command`.

## Procedure

1. Read the active ResearchTask with `get_research_task`.
2. Search or list existing context first: `search_research_tasks`,
   `search_hypotheses`, `search_baselines`, `search_experiments`,
   `search_evaluations`, `list_measurements`, `list_artifacts`, and
   `list_entity_links`.
3. For repository discovery and ordinary repo-native baseline measurement,
   prefer `run_readonly_workspace_command` on the unmodified source workspace.
   Put any temporary logs, metrics, or scratch output under
   `$SITU_COMMAND_OUTPUT_DIR`; do not write `run.log`, `results.tsv`, or similar
   files into the source workspace.
4. If the baseline command needs a writable checkout, the readonly command
   reports a read-only violation, or the workerPrompt explicitly asks for
   `run_workspace_command`, create or select one clearly named baseline
   worktree Experiment and run the command with `run_workspace_command`. Keep it
   as baseline execution evidence: do not intentionally make candidate source
   edits, and do not call `capture_experiment_candidate`.
   Put temporary logs, metrics, checkpoints, and scratch outputs under
   `$SITU_EXPERIMENT_OUTPUT_DIR` or `$SITU_COMMAND_OUTPUT_DIR`, not the worktree
   root.
   If the baseline command is expected to run longer than about one minute, use
   the long-running command pattern from `situ-scientist-runtime`: launch it in
   the background, write pid/status/log files under the Situ output directory,
   poll with short follow-up command calls, and wait for fresh parseable output
   before recording the baseline.
5. Create only the smallest relevant durable records:
   `create_hypothesis`, `create_baseline`, `create_experiment`,
   `create_evaluation`, and `record_measurement`. If the task produces a
   testable claim, write it as a Hypothesis instead of leaving it only in the
   ResearchTask summary.
   Keep titles natural and summaries compact: 1-2 sentences plus bullets when
   useful.
6. For baseline command evidence, require fresh parseable output from the
   current command. If the command fails, times out, produces no parseable
   metrics, or leaves source-like changes in an explore worktree, do not reuse
   stale metrics or invent a baseline; record the missing evidence or call
   `fail_research_task`.
7. Use `create_artifact` and `create_entity_link` when baseline outputs, logs,
   files, hypotheses, or evaluations need durable links.
8. Move baseline and evaluation records through submit, complete, or fail tools
   only when the evidence justifies the status.
9. Submit the ResearchTask with `submit_research_task_for_verification`.

## Tool Boundaries

Allowed tools are durable read/search/list tools, `run_readonly_workspace_command`,
`run_workspace_command` for isolated baseline worktrees, plus durable evidence
tools for hypotheses, baselines, experiments, evaluations, measurements,
artifacts, and entity links.

Use `run_readonly_workspace_command` only for source workspace inspection,
baseline commands, or verification-style checks. Do not use it for candidate
edits or for writing report files. Do not redirect command output to files in
the source workspace; use `$SITU_COMMAND_OUTPUT_DIR` and then summarize or link
the durable evidence. If it reports `readOnlyViolation: true`, retry in an
isolated baseline worktree when that still satisfies the task; otherwise call
`fail_research_task` with the changed files.

Use `run_workspace_command` only after an Experiment record exists, and only for
unmodified baseline/scratch execution in an isolated worktree. Do not use
`capture_experiment_candidate` for a normal explore task. Candidate capture
belongs to `exploit` or `debug` tasks.

If the workerPrompt requires candidate edits or candidate capture,
stop and call `fail_research_task` with a concise mismatch reason instead of
improvising.
