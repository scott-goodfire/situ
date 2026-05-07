# Local App And Web Attach

This spec defines the boundary that lets app-owned Situ sessions be monitored
from a web UI without the web command secretly starting work. It is narrowed by
[0014-local-app-runtime](../0014-local-app-runtime/SPEC.md).

## Purpose

Situ should support this flow:

```text
situ app
  starts the local app server for all projects

situ tui
  connects to the app and starts a fresh session by default

situ web
  serves the local project home and attach-only project monitors over app state
```

The local app server, not the TUI or browser, owns project runtime routing. This
keeps terminal and web surfaces as clients over the same app state.

## App Ownership

The app server owns:

- The global local app lifecycle.
- Project runtime routing and Python harness subprocess ownership when the
  runtime uses subprocesses.
- JSON-RPC communication with project-scoped harness runtimes.
- A localhost HTTP endpoint for client RPC calls.
- A localhost event stream for harness notifications.
- A local app file at `~/.situ/app.json`.

The TUI and web UI are clients. They should not read SQLite directly, own
workers, or spawn the Python harness themselves.

## Web Is Attach-Only

The web command must not create work.

For this slice:

- `situ app` may start the app server, but it must not call `session.start`.
- `situ tui` starts a fresh Situ session by default.
- `situ tui --resume <session-id>` may continue an existing Situ session
  explicitly.
- `situ tui --attach` may connect the TUI to an already-running active session
  without creating work.
- `situ web` may start the local web host and serve the built browser app.
- `situ web` should serve the local project home and should not require the
  current working directory to be an Situ workspace.
- `situ web` must not start the app server unless a future spec makes that an
  explicit user-facing option.
- `situ web` must not start a Python harness.
- `situ web` must not call `session.start`.
- If no live app or active session is found, the web UI should show a clear
  empty or stopped state.

This avoids hidden side effects when a user only wants to monitor.

## App Discovery

The app server should write a small local app file:

```text
~/.situ/app.json
```

The file should identify the localhost URL, process id, local token, and start
time. Clients use it to attach to the current local app.

If the file is missing or the app does not answer a health check, attach-only
clients should show "no active app found" rather than repairing or restarting
the app.

## Local Project Home

The web surface should have a small local home page at `/`.

For this slice:

- `/` lists known local Situ projects discovered from canonical app state.
- `~/.situ/situ.sqlite` is the source of truth for durable product records,
  including workspaces, projects, sessions, objective/context, research objects,
  activities, artifacts, and events.
- Per-project directories are runtime state, not separate product states.
- The list should identify which projects have an active session when that can
  be determined from app state.
- Project links should navigate to `/projects/<project-id>`.
- `/projects/<project-id>` is scoped to that project only. It should not expose
  cross-project navigation inside the monitor view.
- A project page should poll local app/discovery state and attach when the
  project runtime becomes healthy, even if the browser page was opened before a
  session started.
- If the project is known but no active session is running, the page should show
  a clear disconnected state for that project. The local web host should not
  read per-project SQLite product states.
- If the project has no active session and no durable records yet, the page
  should show the attach-only empty state for that project.

This gives users one local URL for finding projects without turning the browser
into the owner of session lifecycle. The browser should receive this metadata
through the local web API; it should not inspect SQLite directly.

## Local Web Host

The development server and local user server should be separate.

For this slice:

- Vite remains the development server for frontend development.
- `situ web` should build the browser app when the built app is missing or a
  rebuild is explicitly requested, then run a local Hono host that serves the
  built assets and local discovery API.
- The local host should serve `/api/projects` and
  `/api/projects/<project-id>/session`.
- Durable research records should be loaded through the local app server's
  collection APIs, not through a separate browser-side SQLite path.
- The local host should serve `/` as the project home and should use SPA
  fallback for `/projects/<project-id>` and child routes.
- The local host should bind to `127.0.0.1` by default.
- The local host should print the project home URL it is serving, including the
  actual port when the port was auto-assigned.

## Local Command Surface

The routine web commands should keep development and local user behavior
separate:

- `mise run web -- [args]` runs `situ web` and serves the built local Hono
  host.
- `mise run web -- --rebuild` forces a browser rebuild before serving.
- `mise run web:dev` and `mise run dev:web` run the Vite development server for
  frontend iteration.
- `mise run web:smoke` builds the browser app, starts the local Hono host, and
  checks the project home, discovery API, app/session discovery API, and
  project-route SPA fallback.

## Project Lifecycle Vocabulary

Project discovery should use explicit lifecycle labels:

- `running`: the app reports an active session for the project.
- `stopped`: the project is known and no active session exists.
- `unhealthy`: app state or routing exists but health checks fail.
- `missing_workspace`: the project points at a workspace path that no longer
  exists.
- `stale`: project metadata is invalid, incomplete, or otherwise inconsistent.

The API should also provide a short status reason that lets UI copy explain the
state without guessing.

## Initial Web Scope

The web UI should use the same collection-backed scope as the slim TUI when a
healthy project runtime is connected:

- Workspaces
- Projects
- Sessions
- Agents
- Tasks
- Task dependencies
- Task entity links
- Task activities
- Analyses
- Analysis activities
- Hypotheses
- Experiments
- Evaluations
- Hypothesis activities
- Experiment activities
- Evaluation activities
- Hypothesis-experiment links
- Artifacts
- Events

Those records should come from the app server's `collections.bootstrap`,
`collections.subscribe`, and row-level collection upsert notifications. The
local web host may discover projects and sessions, but it should not expose a
separate durable research-state read path.

## Web Monitor Behavior

The web monitor should make the attached session easier to scan without becoming
the primary control surface.

For this slice:

- Session, experiment, activity, and event tables should stay compact enough for
  long-running sessions.
- Recent experiment and event views should follow newly appended rows when the
  user is already at the bottom of the table.
- Concern-like rows should be visually distinguishable without hiding the
  underlying record.
- Losing the live app or runtime connection should mark the monitor as
  disconnected or stopped. Reconnecting to a healthy app should reload
  collection state through the app server.
- Motion should be subtle, only reinforce that new rows arrived, and respect
  reduced-motion preferences.
- The monitor remains read-only. Table affordances must not imply that the web
  client can mutate the session.

## Web Information Architecture

The project monitor should expose stable pages over the same attached session
state instead of hiding important objects in drawers.

For this slice:

- `/projects/<project-id>` is the overview for the attached project.
- `/projects/<project-id>/hypotheses` lists hypotheses.
- `/projects/<project-id>/hypotheses/<hypothesis-id>` shows a full hypothesis
  page with fields, linked experiments, evaluation summaries, and activity.
- `/projects/<project-id>/experiments` lists experiments.
- `/projects/<project-id>/experiments/<experiment-id>` shows a full experiment
  page with fields, linked hypotheses, evaluations, artifacts, and activity.
- `/projects/<project-id>/evaluations` lists evaluation evidence threads.
- `/projects/<project-id>/evaluations/<evaluation-id>` shows a full evaluation
  page with fields, source experiment when present, artifacts, and evidence
  activity.
- `/projects/<project-id>/agents` and `/projects/<project-id>/agents/<agent-id>`
  are reserved for agent transcript views.
- `/projects/<project-id>/events` is the raw event/debug page.

These pages are all attach-only views over the local app. They should not start
sessions or mutate research state.

## Overview Page

The overview page should minimize cognitive burden for a researcher joining or
checking a running session. It should not present every collection with equal
weight.

The overview should be a hypothesis board. For this slice, it should prioritize
cards over separate summary sections:

- Backlog hypotheses.
- In-progress hypotheses.
- Done hypotheses.
- Agents or workers recently active on each hypothesis.
- Experiments associated with each hypothesis.
- Evaluation evidence summarized inside each hypothesis card.

Cards should be digestible before they are complete. Prefer one clear evidence
line, one compact presence line, and the most relevant experiment over raw
counts, IDs, or every related record. IDs and full evidence should remain
available on detail pages.

The overview should not also show standalone recent evidence, recent experiment,
or event sections. Internal events belong on the Events page. Evaluations are
the evidence layer, not the primary workflow object. The evaluations route
exists as an inspection path for the evidence records; it should not displace
hypotheses from the overview.

## Agent Transcript Views

Agent pages should make agent work legible without becoming a chat product or a
raw log viewer.

For this slice:

- `/projects/<project-id>/agents` may remain a compact index of agents observed
  in activity records.
- `/projects/<project-id>/agents/<agent-id>` should render a transcript-style
  view over existing hypothesis activity, experiment activity, measurement
  evidence, and related evaluation state.
- Transcript items should use human-readable labels such as "Recorded evidence"
  or "Updated experiment" instead of exposing raw activity payload names as the
  primary text.
- Tool-call-shaped or record-update-shaped activity should be visually compact
  and expandable later, but the default view should emphasize what happened and
  which project record or research object it affected.
- New transcript entries may animate subtly and auto-follow when the user is at
  the bottom of the transcript. Motion should never become the point of the UI.
- Agent presence indicators may appear on overview cards and agent pages when
  they reduce scan cost.

The browser should not introduce a chat composer in this slice. If browser-side
chat or streaming control becomes part of the product later, it should be added
as a separate interaction layer over the same session state.

## Deferred

- Starting, stopping, or reconnecting sessions from the web home.
- Daemonizing the app process.
- Browser actions that mutate sessions or experiments.
- Web-started sessions.
- Authentication beyond a local random token.
