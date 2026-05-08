---
name: task-decomposition
description: Use when converting a broad research objective into task-sized Manager handoffs.
---

# Task Decomposition

## Good Tasks

A good Situ task has:

- One assignee role implied by `kind`.
- A concrete done condition.
- Enough context to start, but not a pasted project board.
- Explicit record expectations when durable output is required.
- Clear links to blockers or parent work when ordering matters.
- Human-readable content: short paragraphs, compact Markdown bullets when
  useful, and inline `code` for commands, files, metrics, and record IDs.

## Patterns

- Research task: inspect context, create or update `Analysis`, optionally create hypotheses, link records, mark done.
- Hypothesize task: convert evidence-backed analysis into testable `Hypothesis` records, link records, mark done.
- Baseline task: inspect workspace, run project-native measurement, create baseline and evaluation evidence, mark done.
- Experiment task: cite accepted or active `hypothesis_ids`, choose a
  `research_thread` and base, make one candidate change, run measurement,
  record evaluation evidence, link experiment, mark done. For descendant work,
  use `base_selector="parent_experiment"` plus `parent_experiment_id` so the
  produced patch is the next aggregate candidate for that thread.
- Interpret task: compare recorded evidence, update `Analysis` or comments, recommend next task.

When choosing a task kind, assume the assignee can load that kind's default
runtime skill. Put any project-specific constraints in task content rather than
duplicating the whole procedure.
