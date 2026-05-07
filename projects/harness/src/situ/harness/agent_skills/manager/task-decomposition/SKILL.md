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

## Patterns

- Research task: inspect context, create or update `Analysis`, optionally create hypotheses, link records, mark done.
- Hypothesize task: convert evidence-backed analysis into testable `Hypothesis` records, link records, mark done.
- Baseline task: inspect workspace, run project-native measurement, create baseline and evaluation evidence, mark done.
- Experiment task: make one candidate change, run measurement, record evaluation evidence, link experiment, mark done.
- Interpret task: compare recorded evidence, update `Analysis` or comments, recommend next task.
- Review task: inspect candidate evidence, write one experiment review, mark done.

When choosing a task kind, assume the assignee can load that kind's default
runtime skill. Put any project-specific constraints in task content rather than
duplicating the whole procedure.
