# Local App Runtime

This spec defines the hard-cutover local runtime: one local Situ app process,
one canonical product state, and multiple clients over that app.

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

`situ secrets`:

- Manages local runtime provider secrets used by app, TUI, web, and manual
  headless execution.
- Supports redacted status, masked interactive setting, explicit per-secret
  unset, and clearing all local runtime secrets.
- Writes only to the local Situ secret store and must not print secret values
  to stdout, stderr, events, product records, or observability attributes.
- Does not manage eval launch secrets. Evals continue to require
  `SITU_OPENAI_KEY` and `SITU_LOGFIRE_TOKEN` from the launch environment.

`situ tui [workspace]`:

- Requires a healthy app server.
- Connects to the app server and scopes requests to the selected workspace.
- Before starting or resuming agent execution, verifies that the required model
  provider secret is available from the local Situ secret store. If the secret
  is missing in an interactive TUI launch, asks the user for it inside the
  fullscreen setup flow and saves it locally before continuing.
- For a default fresh-session launch, refuses a dirty Git-backed workspace
  before opening the fullscreen TUI, onboarding, or creating project/session
  records. Dirty means tracked or untracked changes anywhere in the Git repo
  that contains the selected workspace.
- Opens the fullscreen TUI shell, gathers onboarding answers when objective or
  context are not already supplied, then starts a fresh project and fresh
  attached session.
- Supports explicit resume, for example `situ tui --resume <session-id>`.
- Supports explicit attach-only mode, for example `situ tui --attach`.
- Does not spawn or stop the app server.

`situ web`:

- Requires or discovers the local app server for live monitor attachment.
- Serves the project home and web monitors.
- Lists all known local projects and sessions from the canonical app state.
- Does not start, resume, or attach a session on its own.

The session-facing command vocabulary is `app`, `tui`, and `web`. Maintenance
commands such as `secrets` may manage local runtime state without starting,
resuming, or attaching sessions. Do not keep a `start` compatibility command;
starting a project-backed session happens from the interactive `situ tui` flow
after the app server is already running.

## State Contract

The canonical product database is:

```text
~/.situ/situ.sqlite
```

It stores durable Situ product state across workspaces: known workspaces,
projects, sessions, agents, tasks, analyses, hypotheses, experiments,
evaluations, activities, artifacts, and internal events.

Human-facing product records in this database use compact canonical IDs:
projects `P<N>`, sessions `S<N>`, analyses `A<N>`, hypotheses `H<N>`,
baselines `B<N>`, experiments `EX<N>`, evaluations `EV<N>`, artifacts `ART<N>`,
and tasks `T<N>`. Existing local databases that contain older long-form IDs are
stale for this runtime and may be reset instead of migrated. Workspace IDs may
remain internal path-derived identifiers so the same repo path resolves to the
same workspace boundary.

Per-project runtime state remains under:

```text
~/.situ/projects/<project-id>/
```

This directory may hold runtime-only files such as DBOS state, logs, temporary
run artifacts, managed experiment worktrees, and compatibility metadata. The
first cutover keeps DBOS SQLite per project, for example:

```text
~/.situ/projects/<project-id>/dbos.sqlite
```

Do not combine DBOS into the canonical product database until the app runtime
has a clear multi-project DBOS story. Product state should converge first.

Managed experiment worktrees may live under the project runtime directory, for
example:

```text
~/.situ/projects/<project-id-or-workspace-id>/worktrees/<project-id>/<experiment-id>/
```

They are execution checkouts, not product state. The canonical database should
record enough path and base-commit information to inspect them, but deleting a
worktree must not delete the experiment record.

Local secrets are private runtime configuration, not product state data. The
app may store user-provided provider secrets under the local Situ home with
owner-only file permissions. Stored secrets must not be written to the canonical
SQLite product database, events, collection updates, app/session discovery
records, worker payloads, or observability attributes.

Local app, TUI, web, and manual headless execution use the local Situ secret
store as their provider-secret source. The local OpenAI key is required before
agent execution. The local Logfire token is optional; when present, local runs
may use it for SDK Logfire export, and when absent, local runs continue without
remote Logfire export. Local runtime paths must not treat `SITU_OPENAI_KEY` or
`SITU_LOGFIRE_TOKEN` as credentials. Those Situ-scoped environment secrets
belong to eval execution, where they are required so evals fail clearly instead
of silently reusing a developer's saved local runtime credentials.

## Runtime Boundary

The local app server owns project runtime routing:

```text
TUI / Web / Headless client
  -> local Situ app server over HTTP/SSE
      -> project-scoped harness runtime
          -> workspace folder boundary
          -> canonical product SQLite state database
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
registry that can drift from the product state.

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
- Starting `situ tui` for a dirty Git-backed workspace exits with a clear error
  before the fullscreen TUI opens or a project/session is created.
- Starting `situ tui` without setup inputs shows onboarding before creating a
  project/session.
- Starting `situ tui` without a required model provider secret shows secret
  onboarding before creating or resuming agent work, saves a submitted secret
  locally, and then continues to the normal setup/session flow.
- Secret onboarding may also collect an optional local Logfire token. Skipping
  it must not block local agent execution.
- `situ secrets status`, `situ secrets set openai`,
  `situ secrets set logfire`, `situ secrets unset openai`,
  `situ secrets unset logfire`, and `situ secrets clear` manage only local
  runtime secrets and never reveal saved values.
- Headless or non-interactive local execution uses the local secret store and
  otherwise fails clearly without prompting.
- Eval execution requires `SITU_OPENAI_KEY` and `SITU_LOGFIRE_TOKEN` from the
  launch environment and does not fall back to the local secret store.
- Confirming onboarding or providing setup inputs creates a fresh project and
  fresh attached session unless `--resume` or `--attach` is explicit.
- The default session start stores a non-null `project_id` on the session and a
  `session.started` event associated to both records.
- Closing the TUI does not stop the app server.
- `situ web` can list known projects without a current workspace.
- Product records from multiple workspaces land in `~/.situ/situ.sqlite`.
- DBOS files remain project-scoped under `~/.situ/projects/<project-id>/`.
