---
name: situ-policy-repository-function-vocabulary
description: Use whenever adding, naming, or reviewing methods on a repository under projects/app/src/repositories — including new verbs, predicate variants, or domain-specific operations.
---

# Repository Function Vocabulary

Public methods come from a fixed vocabulary plus a small set of extension patterns.

## Core verbs

- `create` — insert and return.
- `get` — return or `undefined`.
- `require` — return or throw.
- `list` — many rows, no filter beyond a limit.
- `search` — many rows with filter/query.
- `upsert` — create or update by stable identity.
- `addComment` — insert a comment activity row.

## Status transitions

`accept`, `submit`, `complete`, `cancel`, `fail`, `transition` — from `situ-policy-status-record-transitions`.

## Extension patterns

Use when domain meaning makes the core verb wrong:

- `<verb>By<Field>` — predicate variant: `findByWorktreePath`, `listByResearchTask`.
- `<verb>With<Compound>` — compound returns: `getWithActivities`.
- `<verb><EntitySpecifier>` — typed variants for relationship or singleton
  records: `createEntityLink`, `requireResearchTaskVerification`.
- `count<Plural>` — counting helpers: `countChildren`.
- `update<Field>` — partial updates: `updateWorktreeMetadata`, `updateCandidateMetadata`.

## Domain-specific

- Compute targets: `claim`, `release`, `drain`, `restore`, `remove`, `heartbeat`, `markDead`, `poolExists`, `claimForPool`.
- Measurements: `record` (idiomatic for measurements vs `create`).
- Evaluations: `recordExperimentComparison`.

## Other rules

- Each method takes a single object argument (`{ experimentId, ... }`). Never positional.
- Return types are typed records (`*Record`) or arrays of them — not raw drizzle inferred types.
- Names describe the operation in domain terms, not storage terms (`addComment`, not `insertActivity`).

## Avoid

- `findOne`, `getOrCreate`, `save`, `persist`, `load`, `query`, `fetch`.
- A new top-level verb outside the lists above without PR discussion.
- Positional arguments instead of an input bag.
- Exporting an internal `addActivity`-style helper publicly when `addComment` plus typed activity methods would do.

## See also

- `situ-policy-find-require-pair`
- `situ-policy-status-record-transitions`
- `situ-policy-repository-module-shape`
