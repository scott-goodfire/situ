---
name: situ-scientist-debug-task
description: Use for situ Scientist ResearchTasks with type debug: repairing a failed or blocked experiment branch without changing the research question.
---

# situ Scientist Debug Task

Use this skill when the active ResearchTask type is `debug`.

Debug tasks repair a specific failed or blocked branch. They should preserve the
research question and evaluation surface unless the workerPrompt explicitly
asks to debug that surface.

## Procedure

1. Read the active ResearchTask with `get_research_task`.
2. Inspect the failed or blocked context with `search_research_tasks`,
   `search_experiments`, `search_evaluations`, `list_measurements`,
   `list_artifacts`, and `list_entity_links`.
3. Identify the parent ResearchTask, experiment, error, or missing evidence that
   the debug task targets.
4. Reuse or create the narrowest relevant experiment record. If creating a new
   debug experiment, preserve the primary hypothesis from the targeted
   experiment unless the workerPrompt explicitly changes the research question.
5. Use `run_workspace_command` with the experiment id only for the targeted
   debug repair inside the isolated experiment worktree. The worktree is
   prepared automatically when needed.
   Put temporary logs, metrics, and scratch outputs under
   `$SITU_EXPERIMENT_OUTPUT_DIR` or `$SITU_COMMAND_OUTPUT_DIR`; do not create
   `run.log`, `results.tsv`, or similar command-output files in the worktree
   root.
   If a debug rerun is expected to run longer than about one minute, use the
   long-running command pattern from `situ-scientist-runtime`: launch it in the
   background, write pid/status/log files under the Situ output directory, poll
   with short follow-up command calls, and wait for fresh parseable metrics or
   failure evidence before deciding whether the repair worked.
6. Preserve crash or invalid-measurement evidence while debugging. Only convert
   a failed branch into normal metric evidence after a fresh rerun succeeds and
   produces parseable metrics. If the command still fails, times out, or has no
   fresh metrics, keep the failure classification and call `fail_research_task`
   with the log evidence rather than recording it as a discard.
7. Inspect `git status --short` before capture. Remove generated files,
   caches, and command outputs that are not candidate source changes. If you
   manually stage files, prefer explicit paths over `git add -A`.
8. Record the debug result with durable evaluations, measurements, artifacts,
   entity links, and experiment comparisons when applicable.
9. Submit the ResearchTask with `submit_research_task_for_verification` using
   1-3 short evidence sentences or bullets.

## Tool Boundaries

`run_workspace_command` is allowed for debug tasks, but the change must stay
scoped to the known failed branch. Keep command-output files out of the
candidate patch by writing them under `$SITU_EXPERIMENT_OUTPUT_DIR` or
`$SITU_COMMAND_OUTPUT_DIR`.

Do not use a debug task to start an unrelated candidate, alter the metric, or
hide a comparability break. If the failure cannot be debugged with the evidence
available, call `fail_research_task`.
