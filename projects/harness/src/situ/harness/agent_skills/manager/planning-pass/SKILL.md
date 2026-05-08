---
name: planning-pass
description: Use when the Manager needs to plan the next focused Researcher or Scientist task from the current project board.
---

# Planning Pass

## Method

1. Load `task-execution` if this planning pass has assigned task IDs.
2. Read every assigned planning task with `get_task(task_id=...)`.
3. Read `get_project`, `get_project_overview`, and `get_task_overview` as needed.
4. Load `task-board-curation` if the task board is noisy with stale,
   duplicate, vague, blocked, or wrong-role tasks.
5. Read the task triage lane. For each task in triage, decide:
   - Accept it into `backlog` with `accept_task` and a comment explaining why it
     is worth running.
   - Cancel it with `cancel_task` and a comment explaining why it is out of
     scope.
   - Refine it with `update_task` before accepting.
   Research records in `triage` or `in_review` belong to the Critic lane; read
   their status and comments, but do not transition them from the Manager pass.
   Make a triage decision on each intake task before filing new work.
6. Identify the highest-value next uncertainty.
7. File a small batch of concrete tasks, usually one to three.
8. Use dependencies when work must happen in order.
9. Keep task titles short and human-readable; put constraints in task content.
   Write task content as a readable handoff with short paragraphs and compact
   Markdown bullets when useful. Avoid generated-looking numbered scripts unless
   strict ordering is the point of the task.

## Task Choice

- If baseline evidence is missing, file a `baseline` Scientist task.
- After baseline, keep Researchers busy when accepted or active hypotheses are
  missing. File independent `research` or `hypothesize` tasks that can produce
  analyses and testable hypotheses for Scientist work.
- If accepted or active hypotheses exist, file focused Scientist experiment
  tasks and pass the matching `hypothesis_ids` to `create_task`.
- After baseline, default to filing 2-5 tasks per pass across distinct research
  threads unless the runnable board is already deep.
- If recent failed tasks show `infrastructure_retry_count` or
  `last_infrastructure_failure`, treat them as harness failures, not research
  evidence. Do not keep refiling the same experiment intent; choose a different
  useful thread only when the project still has healthy runnable capacity.
- When a usable reviewed experiment has a candidate commit, usually file at
  least one descendant experiment that uses `base_selector="parent_experiment"`
  with that `parent_experiment_id`, so useful patches can compound.
- Treat the best descendant candidate in a lineage as the aggregate candidate
  patch for that thread: it should include the useful ancestor changes plus the
  new tested change, backed by measurements and Critic review. The human-facing
  candidate to inspect or export is usually this reviewed aggregate patch, not
  the isolated last edit.
- If recent experiments have plateaued, escalate variance: a different model
  family, optimizer family, or training regime, or a Researcher synthesis
  pass that proposes the next bold swing. A plateau is a signal to think
  bigger, not to stop.

## Replanning From a Critic Review

When replanning after a Critic review, read the reviewed record's status and
transition comment. Then:

- Record `add_experiment_lineage_decision` on the reviewed experiment before
  filing a follow-up task. Use `continue` or `fork` when building on completed
  results, `reproduce` when evidence is promising but thin, and `cancel` or
  `reject` when the candidate should stop.
- File the descendant, reproduction, or revision task with explicit lineage
  context and the accepted or active `hypothesis_ids` it continues to test.
  For descendant work that stacks on the candidate, use
  `base_selector="parent_experiment"` and `parent_experiment_id`; reserve
  `base_selector="selected_checkout"` for independent exploration.

## Closing the Project

Closing is reserved for hard blockers (workspace unusable, user signalled
stop). A stalling metric is not a hard blocker. When tempted to close, file
one more bold Researcher task or hypothesis-backed experiment instead.
