# Local Session And Web Attach

This spec defines the boundary that lets a terminal-started Almanac session be
monitored from a web UI without the web command secretly starting work.

## Purpose

Almanac should support this flow:

```text
almanac start
  starts the local harness session
  opens the TUI

almanac web
  serves the local project home and attach-only project monitors
```

The local session server, not the TUI or browser, owns the Python harness
process. This keeps terminal and web surfaces as clients over the same state.

## Session Ownership

The session server owns:

- The Python harness subprocess.
- JSON-RPC stdio communication with the harness.
- A localhost HTTP endpoint for client RPC calls.
- A localhost event stream for harness notifications.
- A local session file under the Almanac project directory.

The TUI and web UI are clients. They should not read SQLite directly, own
workers, or spawn the Python harness themselves.

## Web Is Attach-Only

The web command must not create work.

For this slice:

- `almanac start` may start a local session and begin experiments.
- `almanac web` may start the local web host and serve the built browser app.
- `almanac web` should serve the local project home and should not require the
  current working directory to be an Almanac workspace.
- `almanac web` must not start a session server.
- `almanac web` must not start a Python harness.
- `almanac web` must not call `session.start`.
- If no live session is found, the web UI should show a clear empty state.

This avoids hidden side effects when a user only wants to monitor.

## Session Discovery

The session server should write a small local session file:

```text
~/.almanac/projects/<project-id>/session.json
```

The file should identify the workspace, localhost port, process id, and a local
token. Clients use it to attach to the current local session.

If the file is missing or the server does not answer a health check, attach-only
clients should show "no active harness found" rather than repairing or
restarting the session.

## Local Project Home

The web surface should have a small local home page at `/`.

For this slice:

- `/` lists known local Almanac projects discovered from local Almanac state.
- A small global registry at `~/.almanac/almanac.sqlite` may index known
  projects so `/` can remain fast and dependable across many project
  directories.
- The global registry is not the source of truth for research state. It may
  store project id, workspace path, label, discovered time, last seen time, last
  opened time, and archived time.
- The registry should remain a small project index. It must not accumulate
  objectives, hypotheses, experiments, artifacts, or other research state.
- `almanac start` should upsert the global registry for the workspace it is
  starting.
- `almanac web` may backfill missing registry rows from existing per-project
  directories.
- Registry backfill should be an explicit sync step derived from discovered
  project summaries, not an implicit place to add new durable project facts.
- Persistent project facts such as workspace path, project label, objective, and
  last updated time should prefer each project's `almanac.sqlite`, not extra
  metadata sidecar files. Registry values are fallback/index values.
- The list should identify which projects have a healthy active local session
  when that can be determined from the session file and health check.
- Project links should navigate to `/projects/<project-id>`.
- `/projects/<project-id>` is scoped to that project only. It should not expose
  cross-project navigation inside the monitor view.
- A project page should poll local discovery state and attach when the session
  becomes healthy, even if the browser page was opened before the session
  server started.
- If the project is known but no healthy session is active, the page should read
  the last durable project snapshot from that project's `almanac.sqlite` and
  render the same project pages as disconnected read-only state.
- If the project has no healthy session and no durable records yet, the page
  should show the attach-only empty state for that project.

This gives users one local URL for finding projects without turning the browser
into the owner of session lifecycle. The browser should receive this metadata
through the local web API; it should not inspect SQLite directly.

## Local Web Host

The development server and local user server should be separate.

For this slice:

- Vite remains the development server for frontend development.
- `almanac web` should build the browser app when the built app is missing or a
  rebuild is explicitly requested, then run a local Hono host that serves the
  built assets and local discovery API.
- The local host should serve `/api/projects` and
  `/api/projects/<project-id>/session`.
- The local host should serve `/api/projects/<project-id>/snapshot` as a
  read-only durable collection snapshot loaded from the per-project SQLite
  database.
- The local host should serve `/` as the project home and should use SPA
  fallback for `/projects/<project-id>` and child routes.
- The local host should bind to `127.0.0.1` by default.
- The local host should print the project home URL it is serving, including the
  actual port when the port was auto-assigned.

## Local Command Surface

The routine web commands should keep development and local user behavior
separate:

- `mise run web -- [args]` runs `almanac web` and serves the built local Hono
  host.
- `mise run web -- --rebuild` forces a browser rebuild before serving.
- `mise run web:dev` and `mise run dev:web` run the Vite development server for
  frontend iteration.
- `mise run web:smoke` builds the browser app, starts the local Hono host, and
  checks the project home, discovery API, snapshot API, and project-route SPA
  fallback.

## Project Lifecycle Vocabulary

Project discovery should use explicit lifecycle labels:

- `running`: a session file exists and its health check passes.
- `stopped`: the project is known and no live session file exists.
- `unhealthy`: a session file exists but the health check fails.
- `missing_workspace`: the project points at a workspace path that no longer
  exists.
- `stale`: project metadata is invalid, incomplete, or otherwise inconsistent.

The API should also provide a short status reason that lets UI copy explain the
state without guessing.

## Initial Web Scope

The first web UI should use the same collection-backed scope as the slim TUI:

- Objectives
- Sessions
- Hypotheses
- Experiments
- Evaluations
- Hypothesis activities
- Experiment activities
- Evaluation activities
- Hypothesis-experiment links
- Artifacts
- Events

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
- Losing the live session connection should not erase the visible project
  context. The web monitor should keep or reload the latest durable snapshot and
  mark the connection as disconnected or stopped.
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

These pages are all attach-only views over the local session. They should not
start sessions or mutate research state.

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
exists as an inspection path for the evidence ledger; it should not displace
hypotheses from the overview.

## Agent Transcript Views

Agent pages should make agent work legible without becoming a chat product or a
raw log viewer.

For this slice:

- `/projects/<project-id>/agents` may remain a compact index of agents observed
  in activity records.
- `/projects/<project-id>/agents/<agent-id>` should render a transcript-style
  view over existing hypothesis, experiment, and evaluation activities.
- Transcript items should use human-readable labels such as "Recorded evidence"
  or "Updated experiment" instead of exposing raw activity payload names as the
  primary text.
- Tool-call-shaped or ledger-update-shaped activity should be visually compact
  and expandable later, but the default view should emphasize what happened and
  which objective object it affected.
- New transcript entries may animate subtly and auto-follow when the user is at
  the bottom of the transcript. Motion should never become the point of the UI.
- Agent presence indicators may appear on overview cards and agent pages when
  they reduce scan cost.

The browser should not introduce a chat composer in this slice. If browser-side
chat or streaming control becomes part of the product later, it should be added
as a separate interaction layer over the same session state.

## Deferred

- Starting, stopping, or reconnecting sessions from the web home.
- Daemonizing sessions after the terminal command exits.
- Rich multi-workspace dashboards beyond a minimal local project index.
- Browser actions that mutate sessions or experiments.
- Web-started sessions.
- Authentication beyond a local random token.
