# TUI

The first product surface is a TypeScript Ink terminal UI.

The web surface is attach-only in the local app runtime; it monitors app-owned
project/session state and does not replace the TUI.

## Role

The TUI attaches to the local Situ app server, scopes itself to one workspace,
subscribes to live events, bootstraps collection-shaped state, and renders the
observability surface.

It should not own the app server, own the Python harness subprocess, read SQLite
directly, or run workers directly.

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
┌ SITU / workspace / S1 active ─────────────────────────────────────┐
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
vertical dividers between columns. The columns should resize with the terminal.
Task titles should wrap within a bounded row budget before truncating, so the
main screen preserves board shape while showing enough title text to understand
the task.

The task board should prefer durable task records and plain-language task
titles over IDs. Titles should read as short human action phrases rather than
internal labels or workflow narration. Rows should look like terminal-native
work items, for example
`○ [T3] Run cancellation eval`, `● [T4] Test retrieval filter`, and
`✓ [T1] Record baseline eval`. The short task ID should be visible on task
rows so humans and agents can refer to a task without copying a long database
identifier. Other metadata may be secondary or hidden on the main screen.
When a task is linked to durable outputs, the main board should show a compact
flat link row under that task, such as `→ EX3 EV4 M7 ART2`, without opening a
separate task detail view or indenting the link row under the title text. The
done column should prefer the latest completed work first and collapse repeated
or older done rows into a compact `+ N older done tasks` line when they would
make the live board noisy.
Until durable tasks are fully wired, the TUI may derive task-like rows from
existing hypotheses, experiments, evaluations, and concern activities as a
fallback.

The header and counts strip should make live progress legible without turning
the dashboard into a chart wall. Compact visuals such as an experiment budget
bar, concern emphasis, last-activity age, and tiny sparklines are appropriate
only when they are computed from recorded project/session data. Do not show
decorative or fabricated trends.

When the terminal is too small to render the dashboard legibly, show a compact
"please expand terminal" state with the current terminal size and the minimum
required size. The warning state should still allow the normal quit control.

## Start, Resume, And Attach

`situ tui` starts a fresh project-backed session from the interactive terminal
flow, even when older local sessions exist for the same workspace.

The app server must already be running. Opening the TUI must not start or stop
the app server.

Interactive `tui` should behave like a small fullscreen state machine:

- Loading: connect to the app, subscribe, and bootstrap state.
- Secret setup: when required local model provider credentials are missing, ask
  the user to paste the provider key, optionally accept a local Logfire token,
  save submitted secrets to local Situ runtime state, and only then continue.
- Onboarding: gather the objective and research context when CLI inputs did not
  provide them.
- Launching: call `session.start` and wait for the created records.
- Dashboard: render live observability for the created/resumed/attached
  session.
- Error or empty states: explain what action is required without leaving the
  fullscreen shell.

These views should feel like pages inside the same terminal product, not
separate prompt programs. They may reuse the dashboard frame shape, compact
sections, and footer controls while swapping the center content.

Confirming onboarding calls `session.start` and moves into the live dashboard.
Exiting onboarding closes the TUI without starting an agent run. This keeps
opening the product surface distinct from beginning a long-running autoresearch
loop.

`situ tui --resume <session-id>` explicitly resumes an existing session id. The
session id uses the compact `S<N>` form, such as `S1`.
Compatibility commands may offer `situ resume`, defaulting to the latest local
session for the workspace when the user does not provide one.

`situ tui --attach` connects the TUI to an already-running project runtime and
active session. It must not start an app server, start a new session, or resume
a closed session.

The TUI should not silently reconnect to or resume old research state. Session
continuity must come from an explicit command.

Any explicit reconnect choice screen should follow the same fullscreen frame
contract as the start preflight picker, so setup, reconnect, and running views
feel like pages inside one terminal surface rather than separate prompt shapes.

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
When the command palette is opened from the live dashboard, it should replace
the activity pane in place. It must not render below the full-screen frame or
change the dashboard's overall height.

## Setup

For the current implementation slice, setup is resolved before the live
observability screen through CLI-provided objective/context or interactive TUI
onboarding:

- Required local model provider secret when it is not already available.
- Optional local Logfire token.
- Objective
- Research context: how progress is judged, relevant evals, tools, metrics,
  dashboards, logs, artifacts, and in-scope experiment types

The onboarding should accept sparse plaintext and preserve it rather than
forcing a rigid form. Avoid advanced setup screens for autonomy, budgets,
directions, or guidance in the first slice.

Provider secrets are not research context. The TUI may collect them as setup
prerequisites, but it must not render, log, or persist them as session,
activity, event, or artifact content.

The TUI secret check reads the local Situ secret store only. Situ-scoped eval
environment secrets such as `SITU_OPENAI_KEY` and `SITU_LOGFIRE_TOKEN` are not
local runtime credentials and must not bypass TUI secret onboarding. A missing
local Logfire token must not block local runs.

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
