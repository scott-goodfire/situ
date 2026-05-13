---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0019. Split Backend Into Primitive Packages

## Context

The backend will have many durable concepts. A single app package would make it
hard for agents to work independently and hard to test each primitive in
isolation.

At the same time, not every runtime integration deserves a package. Some code
exists only to compose primitives and external services.

## Decision

Durable product primitives live under `projects/app/packages/*`.

Runtime composition lives under `projects/app/src/*`.

```text
projects/app/src/
  actions/
  agent-tools/
  db/
  managed-agents/
  routes/
  scheduler/

projects/app/packages/
  agents/
  agent-sessions/
  artifacts/
  comments/
  common/
  events/
  experiments/
  measurements/
  notifications/
  projects/
  reviews/
  tasks/
  worktrees/
```

`Workspace` is app runtime context at first, not a primitive package. The app
records the local repository path, default branch, initial commit, and Situ home
paths in app-owned configuration or app-owned database state. Add a workspace
package only if workspaces gain their own lifecycle, sync records, or UI.

## Consequences

Primitive packages must not import from `@situ/app`.

The app package wires packages together, owns runtime entrypoints, and hosts
cross-package app actions.

This structure should make it possible for an agent to implement one package by
reading that package's README/SPEC and the relevant ADRs.

The first useful backend slice should prove the architecture vertically before
building every primitive. That slice includes:

- `projects/app/src/db`
- `projects/app/src/routes`
- `projects/app/src/actions`
- `@situ/common`
- `@situ/projects`
- `@situ/tasks`
- `@situ/comments`
- `@situ/notifications`
- `@situ/events`

It should support project creation, task creation/update/assignment, comments,
notifications, events, Replicache push/pull, and package tests.

This slice should stop once the stack, package boundary, app action, and sync
contracts are proven. Later ADRs narrow the agent runtime, experiment,
evidence, command execution, review, and reporting behavior; do not preempt
those decisions in this first slice.

## Related

- ADR 0006: Use Bun, Hono, SQLite, Drizzle, And Replicache
- ADR 0022: Define Common Package Contract
