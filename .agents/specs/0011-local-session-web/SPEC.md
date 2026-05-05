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
  opens a browser monitor for that same session
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
- `almanac web` may start the browser/web dev surface.
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

## Initial Web Scope

The first web UI should use the same collection-backed scope as the slim TUI:

- Objectives
- Sessions
- Hypotheses
- Experiments
- Hypothesis activities
- Experiment activities
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
- Motion should be subtle, only reinforce that new rows arrived, and respect
  reduced-motion preferences.
- The monitor remains read-only. Table affordances must not imply that the web
  client can mutate the session.

## Deferred

- Reusing an already-running session from `almanac start`.
- Daemonizing sessions after the terminal command exits.
- Multi-workspace dashboards.
- Browser actions that mutate sessions or experiments.
- Web-started sessions.
- Authentication beyond a local random token.
