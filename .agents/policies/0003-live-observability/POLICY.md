---
title: Live Observability
status: active
---

# Policy: Live Observability

## Applies To

TUI, CLI status, current-state APIs, event streams, experiment summaries, and
activity rendering.

## Rule

The first product surface should make the live research session legible from the
terminal. Do not add broad health scoring, web UI as the primary surface, live
guidance, or final reports before the TUI observability loop is useful.

## Required Checks

- The TUI shows objective, session status, research context, active
  hypotheses, active experiment, recent experiments, recent activities,
  artifacts when useful, and internal timeline.
- Suspicious results are visible as concern comments in context.
- Raw logs are artifact/drill-down references, not the main screen.
- The same state can be returned as agent-readable JSON.
- The display remains dense and terminal-friendly.

## Red Flags

- A dashboard dominated by raw terminal output.
- A broad Green/Yellow/Red health model before basic objects and activities are
  reliable.
- A dashboard centered only on one best score when activities and hypotheses are
  available.
- A final report feature before live observability works.
- A web UI as the primary first-slice surface.
