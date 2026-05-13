---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0011. Define Common Package Contract

## Context

Primitive packages should be easy for agents to implement and test
independently. If every package invents its own file layout, repository naming,
sync shape, and test conventions, the codebase becomes harder to navigate.

## Decision

Durable primitive packages use a shared structure:

```text
projects/app/packages/<name>/
  README.md
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

- primitive owned
- tables owned
- repository surface
- mutation surface
- sync keys
- invariants
- tests
- what belongs in the app package instead

## Consequences

Subagents can implement packages with lower cognitive load.

Utility packages such as `@situ/common` may omit record-only files when they do
not own durable records. The exception should be documented in that package's
README.

Repository methods should use a small common vocabulary such as `create`,
`get`, `require`, `list`, `search`, `upsert`, and named update methods. Methods
take one object argument.

## Related

- ADR 0008: Split Backend Into Primitive Packages
- ADR 0009: Packages Own Schema, App Composes Database
