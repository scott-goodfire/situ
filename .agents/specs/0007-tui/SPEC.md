# TUI

The first product surface is a TypeScript Ink terminal UI.

There is no web UI in the first slice.

## Role

The TUI starts or connects to the local Python harness, subscribes to live
events, requests snapshots, and renders the run observability surface.

It should not own run behavior, read SQLite directly, or run workers directly.

## First Screen

The first useful screen should look conceptually like:

```text
Almanac

Goal
  Improve toy eval score

Run
  running | experiment 3/10

Evaluation
  Signals: score, latency
  Baseline: score 0.710

Now
  exp_003 running

Findings
  F-001  Shorter prompts improve score in 2/2 toy runs
  F-002  Larger context helps score but increases latency

Experiments
  exp       status       evidence              note
  baseline  completed    score 0.710           initial eval
  exp_001   completed    score 0.724           supports F-001
  exp_002   completed    score 0.760 latency+  supports F-002
  exp_003   running      -                     evaluating

Warnings
  none

Timeline
  #12 experiment.started exp_003
  #13 worker.progress applying candidate
  #14 eval.started
```

## Setup

If no local context exists, the TUI should run a slim setup flow:

- Goal
- How progress is judged
- Relevant evals, tools, metrics, dashboards, logs, or artifacts
- In-scope experiment types

Avoid advanced setup screens for autonomy, budgets, directions, or guidance in
the first slice.

## Product Rule

The TUI is the product surface and the observability output for now. Keep it
boring, dense, and legible.
