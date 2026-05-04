---
title: Live Observability
status: active
---

# Policy: Live Observability

## Applies To

TUI, CLI status, state snapshots, event streams, and experiment summaries.

## Rule

The first product surface should make the live run legible from the terminal.
Do not add broad health scoring, web UI, live guidance, or final reports before
the TUI observability loop is useful.

## Required Checks

- The TUI shows goal, run status, baseline, active experiment, current best valid
  result, recent experiments, warnings, and timeline.
- Suspicious experiments are visible and excluded from the current best valid
  result.
- Raw logs are drill-down references, not the main screen.
- The same state can be returned as agent-readable JSON.
- The display remains dense and terminal-friendly.

## Red Flags

- A dashboard dominated by raw terminal output.
- A broad Green/Yellow/Red health model before basic events and experiments are
  reliable.
- A final report feature before live observability works.
- A web UI in the first slice.
