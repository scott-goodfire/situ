# Local Session And Web Attach

This spec defines the boundary that lets a terminal-started run be monitored
from a web UI without the web command secretly starting work.

## Purpose

Almanac should support this flow:

```text
almanac start
  starts the local harness session
  opens the TUI

almanac web
  opens a browser monitor for that same session
```

The local session, not the TUI or browser, owns the Python harness process. This
keeps terminal and web surfaces as clients over the same run state.

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

- `almanac start` may start a session and start a run.
- `almanac web` may start the browser/web dev surface.
- `almanac web` must not start a session server.
- `almanac web` must not start a Python harness.
- `almanac web` must not call `run.start`.
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

## Initial Web Scope

The first web UI should use the same collection-backed scope as the slim TUI:

- Runs
- Experiments
- Events

It should not render config, evidence, findings, warnings, or tool calls until
those have collection-shaped APIs.

## Deferred

- Reusing an already-running session from `almanac start`.
- Daemonizing sessions after the terminal command exits.
- Multi-workspace dashboards.
- Browser actions that mutate runs.
- Web-started runs.
- Authentication beyond a local random token.
