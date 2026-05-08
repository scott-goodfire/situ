---
title: Live Observability
status: active
---

# Policy: Live Observability

## Applies To

TUI, CLI status, current-state APIs, event streams, experiment summaries,
activity rendering, and the web monitor.

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
- The web monitor (`projects/web`) is **read-only by design** in the current
  slice. It observes durable state through `collections.bootstrap` /
  `.subscribe` and renders. Mutations — creating hypotheses, claiming tasks,
  recording activities, running experiments — happen via agents (through the
  harness's tool surface) or the CLI, not through web forms or buttons. The
  web monitor is a viewer alongside the TUI, not a replacement or a control
  surface.
- Adding a write surface to the web monitor (a "create hypothesis" form, a
  "claim task" button, a "submit comment" textarea) is out of scope until
  the live-observability loop and agent-driven workflow are stable. When that
  changes, a follow-up policy update should make it explicit.

## Red Flags

- A dashboard dominated by raw terminal output.
- A broad Green/Yellow/Red health model before basic objects and activities are
  reliable.
- A dashboard centered only on one best score when activities and hypotheses are
  available.
- A final report feature before live observability works.
- A web UI as the primary first-slice surface.
- Adding mutation surfaces to the web monitor (forms, action buttons, edit
  inputs) before the read-only observability surface is settled and the
  agent/CLI write paths are sufficient.
