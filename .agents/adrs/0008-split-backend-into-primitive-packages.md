---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0008. Split Backend Into Primitive Packages

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

## Consequences

Primitive packages must not import from `@situ/app`.

The app package wires packages together, owns runtime entrypoints, and hosts
cross-package app actions.

This structure should make it possible for an agent to implement one package by
reading that package's README/SPEC and the relevant ADRs.

## Related

- ADR 0006: Use Bun, Hono, SQLite, Drizzle, And Replicache
- ADR 0011: Define Common Package Contract
