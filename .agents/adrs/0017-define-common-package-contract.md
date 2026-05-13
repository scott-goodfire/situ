---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0017. Define Common Package Contract

## Context

Primitive packages should be easy for agents to implement and test
independently. If every package invents its own file layout, repository naming,
sync shape, and test conventions, the codebase becomes harder to navigate.

## Decision

Durable primitive packages use a shared structure:

```text
projects/app/packages/<name>/
  README.md
  mise.toml
  package.json
  tsconfig.json
  src/
    schema.ts
    types.ts
    repository/
    mutations/
    sync.ts
    module.ts
    index.ts
    *.test.ts
```

Package READMEs explain:

- purpose and non-goals
- local `mise run` commands
- primitive owned
- tables owned
- record shape
- public types and enums
- status/type values and their semantics
- repository surface
- mutation surface
- sync keys and serializers
- supported target kinds and actor fields, when applicable
- invariants
- app-owned behavior
- tests
- what belongs in the app package instead

## Consequences

Subagents can implement packages with lower cognitive load.

Each durable primitive package should expose local `mise` tasks for the package
commands an agent needs most often. At minimum:

```text
mise run check
mise run test
```

If a package has docs/spec validation, build output, generated code, or local
fixtures, add local tasks with ordinary names such as `spec:check`, `build`,
`generate`, or `fixtures:update`.

The root `mise.toml` should expose corresponding namespaced tasks for package
commands that are part of normal development:

```text
mise run app:tasks:check
mise run app:tasks:test
```

Utility packages such as `@situ/common` may omit record-only files when they do
not own durable records. The exception should be documented in that package's
README.

Repository methods should use a small common vocabulary such as `create`,
`get`, `require`, `list`, `search`, `upsert`, and named update methods. Methods
take one object argument.

Packages need a `SPEC.md` when the README would otherwise hide important
behavioral contracts. This usually applies to packages with meaningful state
transitions, wake behavior, runtime ownership, experiment isolation, evidence
capture, or review semantics.

Implement package docs before or alongside package code. A subagent should be
able to read a package README/SPEC plus the ADRs and know what to build and how
to test it.

The architecture doc is not a package-local contract. If an implementation
needs record fields, enums, mutation arguments, sync keys, or state-transition
rules for a package, those details belong in that package's README or SPEC.
Cross-cutting rules stay in ADRs.

## Related

- ADR 0014: Split Backend Into Primitive Packages
- ADR 0015: Packages Own Schema, App Composes Database
