# TUI

The first product surface is a TypeScript Ink terminal UI.

The web surface is attach-only in the local session slice; it monitors an
already-running session and does not replace the TUI.

## Role

The TUI attaches to the local session server, subscribes to live events,
bootstraps collection-shaped state, and renders the observability surface.

It should not own the Python harness subprocess, read SQLite directly, or run
workers directly.

For the first collection-backed slice, the TUI should render projects,
sessions, agents, tasks, hypotheses, experiments, evaluations, typed
activities, artifacts when useful, and events from the shared TypeScript
collection layer. It should not request broad current-state composition for
rendering.

Project records are the source of truth for the active objective and research
context on the live dashboard. Session records identify the active run and link
the TUI to the current project, but project-owned records should remain visible
when they are relevant to that project rather than disappearing only because a
single session disconnected or closed.

## First Screen

The first useful screen should look conceptually like:

```text
┌ SITU / workspace / session_0001 active ───────────────────────────┐
│ active session · Improve support-agent resolution · experiments 3/6│
│ workspace · branch/session status · research context preview       │
├ counts ────────────────────────────────────────────────────────────┤
│ experiments 3/6   hypotheses 2   evaluations 4   concerns 1        │
├ tasks ─────────────────────────────────────────────────────────────┤
│ TODO                 │ IN PROGRESS              │ DONE              │
│ ○ Run cancellation…  │ ● Test retrieval filter  │ ✓ Record baseline │
│ ○ Add hallucination… │ ● Compare billing slice  │ ✓ Save result     │
│ ○ Split cancellati…  │                          │ ✓ Capture state   │
├ activity ──────────────────────────────────────────────────────────┤
│ result   baseline resolution 61.0% hallucination 2.4%              │
│ concern  result missing hallucination_rate signal                  │
│ update   retrieval filter running candidate eval                   │
└ ? help · : commands · q quit ──────────────────────────────────────┘
```

## Layout

The TUI should feel like a terminal-native framed session surface, not a chat
transcript or a generic dashboard embedded inside the terminal.

The live dashboard should occupy the available terminal viewport by default.
Use one outer frame with labeled dividers for Situ identity, counts, tasks,
activity, and footer controls. The frame chrome should make section boundaries
clear while the React/Ink implementation still treats the section bodies as
composable panes with measured widths and heights so resizing can reflow and
truncate content predictably.

The task board should be grouped into todo, in-progress, and done columns with
vertical dividers between columns. The columns should resize with the terminal
and truncate each task title independently.

The task board should prefer durable task records and plain-language task
titles over IDs. Rows should look like terminal-native work items, for example
`○ Run cancellation eval`, `● Test retrieval filter`, and `✓ Record baseline
eval`. IDs and metadata may be secondary or hidden on the main screen. Until
durable tasks are fully wired, the TUI may derive task-like rows from existing
hypotheses, experiments, evaluations, and concern activities as a fallback.

The header and counts strip should make live progress legible without turning
the dashboard into a chart wall. Compact visuals such as an experiment budget
bar, concern emphasis, last-activity age, and tiny sparklines are appropriate
only when they are computed from recorded project/session data. Do not show
decorative or fabricated trends.

When the terminal is too small to render the dashboard legibly, show a compact
"please expand terminal" state with the current terminal size and the minimum
required size. The warning state should still allow the normal quit control.

## Start, Resume, And Attach

`situ start` starts a fresh session by default, even when older local
sessions exist for the same project.

Interactive `start` should show a compact preflight picker before any research
work begins. The first picker should offer:

- Start session
- Exit

Selecting Start calls `session.start` and moves into the live dashboard.
Selecting Exit closes the TUI without starting an agent run. This keeps opening
the product surface distinct from beginning a long-running autoresearch loop.

`situ resume` explicitly resumes an existing session id, defaulting to the
latest local session when the user does not provide one.

`situ attach` connects the TUI to an already-running harness process. It
must not start a harness process, start a new session, or resume a closed
session.

The TUI should not silently reconnect to or resume old research state. Session
continuity must come from an explicit command.

## Command Surface

The running observability view should not show an always-on free-text prompt.
Situ is supervising a live research session, not hosting a chat conversation.

The default running screen should be read-only except for explicit terminal
controls. Use a compact footer for common keys such as help, commands, and quit.
Prefer `?` for help, `:` for commands, and `q` for quit. Reserve `/` for future
filter or search entry. Free-text entry should appear only in an intentional
mode, such as a command prompt, setup prompt, reconnect choice, confirmation,
filter, or future note composer.

The first slice command palette should stay small and operational. It may expose
status, help, and quit, but should not send arbitrary user text to the agent.

## Setup

For the current implementation slice, setup is resolved before the live
observability screen through CLI-provided objective/context or sparse defaults:

- Objective
- Research context: how progress is judged, relevant evals, tools, metrics,
  dashboards, logs, artifacts, and in-scope experiment types

Avoid advanced setup screens for autonomy, budgets, directions, or guidance in
the first slice. A future interactive terminal prompt can be added once the
session lifecycle is stable.

## Observability Visualizations

Charts should start as compact observability components that explain what a
session is learning. They should be useful in both the TUI and attach-only web
surface, with shared TypeScript chart models underneath.

For interpretability-heavy work, the first durable chart vocabulary is:

- Token-feature activation matrices: which features fired on which tokens.
- Steering dose-response curves: how behavior changes as steering strength
  changes.
- Contrastive feature differences: which features distinguish one dataset or
  behavior slice from another.
- Patching and attribution heatmaps: where interventions changed the outcome.
- Contribution bars: which components or features contributed most.

These components should stay small, data-first, and story-backed. Do not turn
them into a full feature browser until the session data model needs that.

## Product Rule

The TUI is the product surface and the observability output for now. Keep it
boring, dense, and legible.

The top-level live view should summarize long evidence instead of printing raw
stdout, stderr, diffs, or fenced log blocks inline. Experiments, activities, and
events should show compact previews on the main screen; full evidence remains in
the durable activity or artifact record for a focused detail view or
agent-readable export.
