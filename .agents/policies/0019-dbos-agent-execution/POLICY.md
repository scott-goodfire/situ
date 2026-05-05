---
title: DBOS Agent Execution
status: active
---

# Policy: DBOS Agent Execution

## Applies To

Pydantic AI agents, agent runtimes, agent tools, DBOS setup, and any code that
starts long-running or state-mutating agent work.

## Rule

Use Pydantic AI's `DBOSAgent` as the default durability boundary for Situ
agents. Situ should not build custom DBOS workflow orchestration around an
agent run when the same behavior can live as a Pydantic AI agent with typed
tools.

Custom DBOS workflows are allowed only for non-agent orchestration that cannot
reasonably be represented as agent/tool behavior.

## Required Checks

- Wrap each runnable Pydantic AI agent in `DBOSAgent`.
- Create the wrapped agent before `launch_dbos()` so DBOS recovery can find the
  registered workflows.
- Give every durable agent a stable kebab-case name.
- Keep agent dependencies small and serializable. Do not pass live SQLite
  connections, repository instances, subprocess handles, callbacks, or worker
  managers into `DBOSAgent.run*`.
- Pass lightweight context such as `session_id`, `project_id`, `project_dir`,
  and `repo_path`; reopen repositories or workers inside tool execution when
  needed.
- Prefer explicit Situ tools over custom workflow steps for agent-visible
  behavior: inspect session state, create or update hypotheses and experiments,
  link records, attach artifacts, and add comments.
- Use DBOS steps around side-effecting custom tool internals when replay safety
  becomes necessary. Keep that wrapping local to the tool, not as a parallel
  session engine.
- Persist Pydantic AI message history as the durable agent transcript.
- Keep agent-visible experiment execution inside typed tools instead of
  reintroducing a deterministic proposal loop.

## Red Flags

- A custom DBOS workflow that reproduces the Pydantic AI agent run loop.
- A background thread or subprocess that performs agent work without a durable
  agent boundary.
- Passing `Repositories`, `Database`, `WorkerManager`, or notification callbacks
  as DBOS agent deps.
- Registering agents, workflows, or DBOS-wrapped tools after `launch_dbos()`.
- Adding a second source of truth for tool calls when Pydantic AI messages and
  Situ activities already capture the useful state.

## Review Questions

- Is this actually agent behavior, or is it lower-level harness orchestration?
- Could the behavior be expressed as an Situ tool called by a `DBOSAgent`?
- Are the DBOS run inputs small, serializable, and stable across process
  restart?
- Does the change preserve terminal observability through the ledger and
  activities rather than inventing a separate workflow UI?
