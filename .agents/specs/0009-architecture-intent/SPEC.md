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
          -> project (research effort, owns product records and coordination)
              -> objective         (project field)
              -> research context  (project field)
              -> agents and tasks  (project-owned, session provenance)
              -> analyses          (project_id required)
              -> hypotheses        (project_id required)
              -> experiments       (project_id required)
              -> evaluations       (project_id required)
              -> hypothesis/experiment links
              -> activities        (parent-scoped, session provenance)
              -> artifacts         (project_id required)
              -> internal events   (project/session associations)
          -> session (workspace_id required, project_id optional)
              -> worker execution
```

The system should keep these responsibilities distinct:

- TUI: presentation, slim setup, collection-backed rendering, event display,
  and explicit start/resume/attach session intent
- Web UI: attach-only monitoring and local project/session discovery
- Local app server: global app lifecycle, canonical database access, project
  runtime routing, HTTP RPC, and event streaming
- Harness: workspace/project/session lifecycle, durable state, internal events,
  agents, tasks, analyses, hypotheses, experiments, evaluations, links, activities,
  artifacts, and automated trust concerns. Objective and research context are
  fields on Project.
- Workers: concrete experiments, code changes, eval runs, analysis
- Protocol/API: stable boundary between clients, the app server, harness
  runtimes, and workers

The app server is not a session. It should be possible to run one app server
for all local Situ workspaces, then start or resume sessions from clients.
Product state should converge in the canonical database described by
[0014-local-app-runtime](../0014-local-app-runtime/SPEC.md), while DBOS runtime
state remains project-scoped until there is a deliberate global DBOS design.

## Collection Sync Boundary

The UI sync surface is normalized around durable records, not one broad
application-state object. The collection-backed sync surface is:

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
- Hypothesis/experiment links
- Hypothesis activities
- Experiment activities
- Evaluation activities
- Artifacts
- Events

Full current-state composition should live in harness API services and schemas,
not in a snapshot repository or durable snapshot model. UI work should use
collection-shaped bootstrap data and row-level upsert notifications. Agent code
should use explicit project/session APIs. This keeps the TUI and future web UI
aligned with a shared TypeScript collection layer without requiring a full sync
engine yet.

Artifacts, deletes, pagination, optimistic writes, and a durable collection
change log are out of scope.

## Agent Runtime

The agent runtime uses Pydantic AI for typed agent-facing planning and DBOS
for durable execution boundaries. It lives as infrastructure under the
Python harness, not as a new product surface.

- Pydantic AI inspects the compact, typed project board.
- DBOS wraps agent execution through Pydantic AI `DBOSAgent`.
- Logfire observes harness, DBOS, and Pydantic AI spans.
- The agent requests experiment execution through typed Situ tools.
- The harness owns workspace/project/session identity, worker execution,
  automated trust concerns, activities, artifacts, events, task coordination,
  and persisted message history.

This keeps creativity in the agent layer while preserving Situ as the
control plane.

## Reference Prototype

The earlier `~/macromackie/almanac` project proved a useful local vertical
slice:

- TypeScript terminal UI
- Python harness
- JSON-RPC over stdio
- SQLite state
- Agent/tool-driven proposer
- Worker subprocess
- Shared Python/TypeScript protocol generation

This repo should borrow the useful engineering pattern: clear local process
boundaries, durable state, explicit protocol contracts, and small command
scripts behind `mise` tasks.

Situ stays close to that structure:

```text
projects/tui                  projects/harness
TypeScript + Ink   HTTP/SSE   local app server   JSON-RPC   Python
terminal UI      ---------->  TypeScript       ---------->  project harness runtime
```

## Scope

In scope:

- Workspace as the folder boundary
- Project state with objective and research context fields
- Sessions as execution/provenance windows attached to zero or one project
- Project-owned agents, tasks, analyses, hypotheses, experiments, and evaluations
- Activities (parent-scoped)
- Artifact references (project-required)
- Internal event log with optional project/session associations
- TypeScript Ink TUI

Out of scope until the agent/tool loop is trustworthy: parallelism, plugins,
and remote workers.
