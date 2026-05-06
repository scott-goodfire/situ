# Local App Runtime

This spec defines the hard-cutover local runtime: one local Situ app process,
one canonical product ledger, and multiple clients over that app.

## Purpose

Situ should be easy to reason about operationally:

- `situ app` starts the long-running local app server.
- `situ tui` opens the terminal observability surface for one workspace.
- `situ web` opens the local project home and web monitors.

The app server is unrelated to any one session. It is the local control plane
for all known workspaces, projects, and sessions. Sessions are execution
windows created or resumed through clients.

## Command Contract

`situ app`:

- Starts the local app server on `127.0.0.1`.
- Writes a live app record at `~/.situ/app.json` with URL, token, process id,
  and start time.
- Owns HTTP RPC, event streams, and project runtime routing.
- Does not call `session.start`, `session.resume`, or any worker action by
  itself.

`situ tui [workspace]`:

- Requires a healthy app server.
- Connects to the app server and scopes requests to the selected workspace.
- Starts a fresh session by default.
- Supports explicit resume, for example `situ tui --resume <session-id>`.
- Supports explicit attach-only mode, for example `situ tui --attach`.
- Does not spawn or stop the app server.

`situ web`:

- Requires or discovers the local app server for live monitor attachment.
- Serves the project home and web monitors.
- Lists all known local projects and sessions from the canonical app state.
- Does not start, resume, or attach a session on its own.

The older `situ start`, `situ resume`, and `situ attach` commands may remain as
compatibility aliases while users migrate, but the primary command vocabulary is
`app`, `tui`, and `web`.

## State Contract

The canonical product database is:

```text
~/.situ/situ.sqlite
```

It stores durable Situ product state across workspaces: known workspaces,
projects, sessions, agents, tasks, analyses, hypotheses, experiments,
evaluations, activities, artifacts, and internal events.

Per-project runtime state remains under:

```text
~/.situ/projects/<project-id>/
```

This directory may hold runtime-only files such as DBOS state, logs, temporary
run artifacts, and compatibility metadata. The first cutover keeps DBOS SQLite
per project, for example:

```text
~/.situ/projects/<project-id>/dbos.sqlite
```

Do not combine DBOS into the canonical product database until the app runtime
has a clear multi-project DBOS story. Product state should converge first.

## Runtime Boundary

The local app server owns project runtime routing:

```text
TUI / Web / Headless client
  -> local Situ app server over HTTP/SSE
      -> project-scoped harness runtime
          -> workspace folder boundary
          -> canonical product SQLite ledger
          -> per-project DBOS runtime state
          -> workers and tools
```

The app server may host project runtimes directly or supervise project-scoped
harness subprocesses. Either implementation is valid if these guarantees hold:

- A single app process can serve many workspaces/projects.
- The app process is not itself a session.
- The app can route client RPC and events by workspace/project scope.
- Product records are durable in the single canonical SQLite database.
- DBOS state remains isolated per project until a future spec changes that.

## Web Project Home

The web home exists because humans should be able to open one local URL and see
their Situ projects. It should be backed by canonical app state, not a separate
registry that can drift from the product ledger.

The home should show at least:

- Known workspaces/projects.
- Whether an app server is healthy.
- Whether each project has an active session.
- Recent sessions and stopped state.
- Links into scoped project monitors.

The browser remains a client. It should not own workers or session lifecycle.

## Deferred

- Daemon installation or OS login integration.
- Global DBOS consolidation.
- Remote app servers or multi-user auth.
- Web-started sessions.
- Rich project management beyond local observability.

## Review Criteria

- Starting `situ app` does not create a session.
- Starting `situ tui` creates a fresh session unless `--resume` or `--attach`
  is explicit.
- Closing the TUI does not stop the app server.
- `situ web` can list known projects without a current workspace.
- Product records from multiple workspaces land in `~/.situ/situ.sqlite`.
- DBOS files remain project-scoped under `~/.situ/projects/<project-id>/`.
