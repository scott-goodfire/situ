# Architecture Intent

This spec is intentionally high-level. It defines product-shaped boundaries, not
final implementation details.

## Local First

Situ should feel like a local agent tool:

- The current repo is the workspace being researched.
- Situ state is private by default.
- Canonical product state should live in one local database under the user's
  home directory, `~/.situ/situ.sqlite`.
- Project-scoped runtime state should live under the user's home directory, for
  example `~/.situ/projects/<project-id>/`.
- Nothing should be written to the researched repo unless the user explicitly
  exports or publishes it.

Out of scope by default: writing to the researched repo. Optional explicit
exports — winning patches, PR bodies, project briefs, agent instructions,
reports — are the only way Situ touches the researched repo.

## Runtime Boundary

Situ observes and supervises the local loop. Workers do the concrete
experiment work.

```text
TypeScript Ink TUI / Web / Headless clients
  -> local Situ app server over HTTP/SSE
      -> project-scoped Python harness runtime
          -> workspace (folder boundary)
          -> project (research effort; owns the research records,
                      coordination records, activities, artifacts, and
                      internal events; carries objective and research
                      context as fields)
          -> session (workspace_id required, project_id optional)
              -> worker execution
```

The system keeps these responsibilities distinct:

- TUI: presentation, slim setup, collection-backed rendering, event display,
  and explicit start/resume confirmation.
- Web UI: read-only monitoring and local project/session discovery.
- Local app server: global app lifecycle, canonical database access, project
  runtime routing, HTTP RPC, and event streaming.
- Harness: workspace/project/session lifecycle, durable research and
  coordination state, internal events, activities, artifacts, and
  automated trust checks. Objective and research context are fields on
  Project.
- Workers: concrete experiments, code changes, eval runs, analysis.
- Protocol/API: stable boundary between clients, the app server, harness
  runtimes, and workers.

The app server is not a session. One app server runs for all local Situ
workspaces, with sessions started or resumed from clients. Product state
lives in the canonical database described by
[0014-local-app-runtime](../0014-local-app-runtime/SPEC.md). DBOS runtime
state is project-scoped.

## Collection Sync Boundary

The UI sync surface is normalized around durable Situ product records,
not one broad application-state object. Each first-class record type
(workspaces, projects, sessions, research records, their activities,
links, artifacts, and the internal event log) is carried as its own
collection. The exact set is owned by the harness API services and
schemas and grows with the product model.

Full current-state composition lives in harness API services and schemas,
not in a snapshot repository or durable snapshot model. UI work uses
collection-shaped bootstrap data and row-level upsert notifications.
Agent code uses explicit project/session APIs. This keeps the TUI and web
UI aligned with a shared TypeScript collection layer without requiring a
full sync engine.

Deletes, pagination, optimistic writes, and a durable collection change
log are out of scope.

## Agent Runtime

The agent runtime uses Pydantic AI for typed agent-facing planning and DBOS
for durable execution boundaries. It lives as infrastructure under the
Python harness, not as a new product surface.

- Pydantic AI inspects the compact, typed project board.
- DBOS wraps agent execution through Pydantic AI `DBOSAgent`.
- Logfire observes harness, DBOS, and Pydantic AI spans.
- The agent requests experiment execution through typed Situ tools.
- The harness owns workspace/project/session identity, worker execution,
  automated trust checks, activities, artifacts, events, task coordination,
  and persisted message history.

This keeps creativity in the agent layer while preserving Situ as the
control plane.

```text
projects/tui                  projects/harness
TypeScript + Ink   HTTP/SSE   local app server   JSON-RPC   Python
terminal UI      ---------->  TypeScript       ---------->  project harness runtime
```

## Scope

In scope: workspace as the folder boundary; project state with objective
and research context as fields; sessions as execution/provenance windows
attached to zero or one project; the full project-owned research and
coordination record set with parent-scoped activities, artifact
references, and an internal event log; the TypeScript Ink TUI.

Out of scope: parallelism, plugins, and remote workers.
