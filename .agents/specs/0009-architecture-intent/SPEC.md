# Architecture Intent

This spec is intentionally high-level. It defines product-shaped boundaries, not
final implementation details.

## Local First

Almanac should feel like a local agent tool:

- The current repo is the workspace being researched.
- Almanac state is private by default.
- State should live under the user's home directory, for example
  `~/.almanac/projects/<project-id>/`.
- Nothing should be written to the researched repo unless the user explicitly
  exports or publishes it.

Future optional repo artifacts can include winning patches, PR bodies, project
briefs, agent instructions, or reports.

For the first slice, avoid repo writes entirely unless needed for the toy example
or explicitly requested.

## Runtime Boundary

Almanac observes and supervises the local loop. Workers do the concrete
experiment work.

```text
TypeScript Ink TUI
  -> local session server over HTTP/SSE
      -> Python harness over JSON-RPC stdio
          -> objective
          -> session ledger
          -> hypotheses
          -> experiments
          -> hypothesis/experiment links
          -> activities
          -> artifacts
          -> internal events
          -> worker execution
```

The system should keep these responsibilities distinct:

- TUI: presentation, slim setup, collection-backed rendering, event display
- Web UI: attach-only monitoring over an existing local session
- Session server: harness subprocess ownership, HTTP RPC, event streaming, and
  local session discovery
- Harness: objective/session lifecycle, durable state, internal events,
  hypotheses, experiments, links, activities, artifacts, and automated trust
  concerns
- Workers: concrete experiments, code changes, eval runs, analysis
- Protocol/API: stable boundary between clients, harness, and workers

## Collection Sync Boundary

The first UI sync surface should be normalized around durable records instead of
one broad application-state object.

For the first collection-backed slice, the sync surface is:

- Objectives
- Sessions
- Hypotheses
- Experiments
- Hypothesis activities
- Experiment activities
- Events

Full current-state composition should live in harness API services and schemas,
not in a snapshot repository or durable snapshot model. UI work should use
collection-shaped bootstrap data and row-level upsert notifications. Agent code
should use explicit agent-context APIs. This keeps the TUI and future web UI
aligned with a shared TypeScript collection layer without requiring a full sync
engine yet.

Artifacts, deletes, pagination, optimistic writes, and a durable collection
change log are deferred until the basic UI loop works.

## Agent Runtime

The first real agent runtime should use Pydantic AI for typed agent-facing
planning and DBOS for durable execution boundaries. This should be introduced as
infrastructure under the Python harness, not as a new product surface.

For the MVP:

- Pydantic AI may produce compact, typed agent context.
- DBOS may wrap agent execution so model calls and tool execution can become
  durable workflow steps.
- Logfire may observe harness, DBOS, and Pydantic AI spans.
- The product must still run locally without requiring a hosted model key.
- Agent output is advisory until the proposal loop is ready; the harness still
  owns objective/session identity, hypotheses, experiments, activities,
  artifacts, and events.

This keeps creativity in the agent layer while preserving Almanac as the
control plane.

## Reference Prototype

The earlier `~/macromackie/almanac` project proved a useful local vertical
slice:

- TypeScript terminal UI
- Python harness
- JSON-RPC over stdio
- SQLite state
- Deterministic proposer
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

- Local project context
- Objective
- Session ledger
- Hypotheses
- Experiments
- Activities
- Artifact references
- Internal event log
- TypeScript Ink TUI

Only add richer agent orchestration, parallelism, plugins, and remote workers
after the core loop is trustworthy.
