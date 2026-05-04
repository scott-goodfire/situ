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
  running | experiment 3/10 | baseline 0.710

Current Best Valid
  exp_002 | score 0.760 | delta +0.050 | suspicious no

Now
  exp_003 running
  eval command: pnpm eval --json

Experiments
  exp       status       score     delta     valid     note
  baseline  completed    0.710     -         yes       initial eval
  exp_001   completed    0.724     +0.014    yes       kept as best
  exp_002   completed    0.760     +0.050    yes       current best
  exp_003   running      -         -         -         evaluating

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
- Eval command
- Primary metric key
- Maximize/minimize
- Optional forbidden paths

Avoid advanced setup screens for autonomy, budgets, directions, or guidance in
the first slice.

## Product Rule

The TUI is the product surface and the observability output for now. Keep it
boring, dense, and legible.
