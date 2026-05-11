---
name: situ-context-runtime
description: Use when learning or debugging Situ's backend runtime, CLI, server routes, DB, scheduler, work items, tools, or agent execution.
---

# Situ Context Runtime

## Goal

Learn the backend execution path from current source. Locate startup,
routes, durable writes, queueing, Managed Agent turns, and verification
commands by responsibility rather than fixed filenames.

## What To Look For

Locate app startup and route mounting:

- CLI entry point
- app/server creation
- Hono route mounting
- `/api` route groups
- scheduler startup
- shutdown handling
- runtime context/session initialization

Locate database and repository boundaries:

- migration runner
- schema definitions
- sync tracking columns
- `runSyncedWrite`
- repository modules
- `get` / `require` / `find` / `list` conventions
- status transitions
- transaction and sync notification behavior

Locate queue and scheduler flow:

- work-item creation
- work-item purpose and target
- claim tokens
- leases and heartbeats
- retry/fail/complete behavior
- scheduler jobs
- due work dispatch
- compute target allocation when relevant

Locate Managed Agent execution:

- agent role registry
- Manager / Scientist / Verifier blueprints
- prompt builders
- runtime skills
- custom tool registry
- role-scoped write tools
- Claude session/run creation
- tool call handling
- run completion/failure handling

Locate sync to the web client:

- Replicache pull membership
- key prefixes
- synced rows
- local settings
- project/task/evidence rows exposed to UI

Locate proof:

- repository contract tests
- research-project runtime tests
- compute/lease tests
- tool registry tests
- skill registry tests
- observability/runtime tests

## What To Learn

Build a file-backed answer to:

- How does the local app/server start?
- Where are API routes mounted?
- Which table/repository owns the durable state?
- How does a domain event enqueue work?
- How does the scheduler claim and execute work?
- How does queued work become a Managed Agent turn?
- Which custom tools can mutate state?
- Which policies govern the surface you are inspecting?
- Which tests cover this flow, and where is coverage missing?

## Investigation Pattern

For a runtime feature:

1. Identify the route, CLI command, scheduler job, work-item purpose, or
   tool that starts it.
2. Trace writes into repository methods and schema.
3. Trace queued work into claim, lease, handler, and agent-run code.
4. Check whether Replicache exposes results to web.
5. Read the closest tests before editing.
6. If no focused test covers the changed behavior, plan a narrow test.

When editing, reviewing, or validating a matching surface, load the
specific policy skill for routes, migrations, repositories, runtime
modules, tools, or synced writes.

## Verification

Use checks that match the change:

- app typecheck for backend type or import changes
- repository tests for durable state changes
- research-project/runtime tests for dispatch changes
- tool tests for role/tool-surface changes
- compute tests for claim/lease changes
- full repo check before finalizing broad runtime changes

## Reporting

Report entry point, durable tables, repository methods, queue/work-item
path, agent/tool surface, tests read or run, and uninspected branches.
