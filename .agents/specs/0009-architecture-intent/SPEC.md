# Architecture Intent

This spec is intentionally high-level. It defines product-shaped boundaries, not
final implementation details.

## Local First

Situ should feel like a local agent tool:

- The current repo is the workspace being researched.
- Situ state is private by default.
- State should live under the user's home directory, for example
  `~/.situ/projects/<project-id>/`.
- Nothing should be written to the researched repo unless the user explicitly
  exports or publishes it.

Future optional repo artifacts can include winning patches, PR bodies, project
briefs, agent instructions, or reports.

For the first slice, avoid repo writes entirely unless explicitly requested.

## Runtime Boundary

Situ observes and supervises the local loop. Workers do the concrete
experiment work.

```text
TypeScript Ink TUI
  -> local session server over HTTP/SSE
      -> Python harness over JSON-RPC stdio
          -> project (workspace boundary, owns sessions)
          -> session (project_id required, owns the ledger)
              -> objective         (1:1 sibling record)
              -> research context  (1:1 sibling record)
              -> hypotheses        (session_id required)
              -> experiments       (session_id required)
              -> evaluations       (session_id required)
              -> hypothesis/experiment links
              -> activities        (parent-scoped, no session_id)
              -> artifacts         (session_id required)
              -> internal events
              -> worker execution
```

The system should keep these responsibilities distinct:

- TUI: presentation, slim setup, collection-backed rendering, event display
- Web UI: attach-only monitoring over an existing local session
- Session server: harness subprocess ownership, HTTP RPC, event streaming, and
  local session discovery
- Harness: project/session lifecycle, durable state, internal events,
  hypotheses, experiments, evaluations, links, activities, artifacts, and
  automated trust concerns. Objective and research context are
  agent-populated session-owned records, not session columns.
- Workers: concrete experiments, code changes, eval runs, analysis
- Protocol/API: stable boundary between clients, harness, and workers

## Collection Sync Boundary

The first UI sync surface should be normalized around durable records instead of
one broad application-state object.

For the first collection-backed slice, the sync surface is:

- Sessions
- Hypotheses
- Experiments
- Hypothesis activities
- Experiment activities
- Events

Full current-state composition should live in harness API services and schemas,
not in a snapshot repository or durable snapshot model. UI work should use
collection-shaped bootstrap data and row-level upsert notifications. Agent code
should use explicit session/objective APIs. This keeps the TUI and future web UI
aligned with a shared TypeScript collection layer without requiring a full sync
engine yet.

Artifacts, deletes, pagination, optimistic writes, and a durable collection
change log are deferred until the basic UI loop works.

## Agent Runtime

The first real agent runtime should use Pydantic AI for typed agent-facing
planning and DBOS for durable execution boundaries. This should be introduced as
infrastructure under the Python harness, not as a new product surface.

For the current slice:

- Pydantic AI may inspect compact, typed session context.
- DBOS should wrap agent execution through Pydantic AI `DBOSAgent`.
- Logfire may observe harness, DBOS, and Pydantic AI spans.
- The agent may request experiment execution through typed Situ tools.
- The harness still owns objective/session identity, worker execution,
  automated trust concerns, activities, artifacts, events, and persisted
  message history.

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

It should stay close to that structure for the first implementation:

```text
projects/tui                  projects/harness
TypeScript + Ink   HTTP/SSE   session server   JSON-RPC   Python
terminal UI      ---------->  TypeScript     ---------->  local harness runtime
```

## Implementation Bias

Start with a narrow, durable core:

- Local project (workspace boundary, owns sessions)
- Session ledger with session-owned objective and research context records
- Hypotheses, experiments, evaluations (all session-required)
- Activities (parent-scoped)
- Artifact references (session-required)
- Internal event log
- TypeScript Ink TUI

Only add parallelism, plugins, and remote workers after the agent/tool loop is
trustworthy.
