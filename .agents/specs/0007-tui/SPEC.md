# TUI

The first product surface is a TypeScript Ink terminal UI.

The web surface is attach-only in the local session slice; it monitors an
already-running session and does not replace the TUI.

## Role

The TUI attaches to the local session server, subscribes to live events,
bootstraps collection-shaped state, and renders the observability surface.

It should not own the Python harness subprocess, read SQLite directly, or run
workers directly.

For the first collection-backed slice, the TUI should render sessions,
hypotheses, experiments, hypothesis activities, experiment activities, and
events from the shared TypeScript collection layer. It should not request broad
current-state composition for rendering.

## First Screen

The first useful screen should look conceptually like:

```text
Almanac

Objective
  Improve support-agent resolution rate without increasing hallucinations

Session
  session_0001 | active | experiments 3/6

Hypotheses
  hyp_0001 active  Retrieval filtering improves billing answers
  hyp_0002 open    Cancellation-ticket failures need a separate prompt path

Now
  exp_session_0001_retrieval_filter active

Experiments
  exp                                  status   summary
  exp_session_0001_baseline            closed   Baseline support eval
  exp_session_0001_retrieval_filter    active   Filter low-score snippets
  exp_session_0001_cancellation_prompt open     Split cancellation prompt

Recent Activity
  result   baseline resolution 61.0% hallucination 2.4%
  result   retrieval filter improved billing slice
  concern  result missing hallucination_rate signal
  update   cancellation tickets remain the weakest slice

Timeline
  #12 experiment.started exp_session_0001_retrieval_filter
  #13 worker.progress applying candidate
  #14 experiment.activity.result recorded
```

## Layout

The TUI should feel like a terminal-native session surface, not a boxed
dashboard embedded inside the terminal.

Use a compact framed banner for the initial Almanac identity, workspace, and
session status at the top of the screen. The live observability body beneath it
should be unframed: sections may use headings, spacing, and compact separators,
but the full terminal surface should not be wrapped in a persistent outer box.

## Reconnect

When the TUI starts and collection bootstrap finds an already-active session for
the workspace, the user should see an intermediate reconnect prompt before the
full live session view is shown.

The prompt should identify the workspace, active session, and objective when
available, then offer a small choice menu. The first slice should only offer:

- Reconnect
- Quit

Do not offer "start new session" from this prompt until the session lifecycle
supports that explicitly.

## Command Surface

The running observability view should not show an always-on free-text prompt.
Almanac is supervising a live research session, not hosting a chat conversation.

The default running screen should be read-only except for explicit terminal
controls. Use a compact footer for common keys such as help, commands, and quit.
Prefer `?` for help, `:` for commands, and `q` for quit. Reserve `/` for future
filter or search entry. Free-text entry should appear only in an intentional
mode, such as a command prompt, setup prompt, reconnect choice, confirmation,
filter, or future note composer.

The first slice command palette should stay small and operational. It may expose
status, help, and quit, but should not send arbitrary user text to the agent.

## Setup

If no local context exists, the TUI should run a slim setup flow:

- Objective
- How progress is judged
- Relevant evals, tools, metrics, dashboards, logs, or artifacts
- In-scope experiment types

Avoid advanced setup screens for autonomy, budgets, directions, or guidance in
the first slice.

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
