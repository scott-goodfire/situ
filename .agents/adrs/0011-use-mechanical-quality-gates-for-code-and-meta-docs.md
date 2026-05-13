---
status: accepted
implementation_status: partially_implemented
created: 2026-05-12
---

# 0011. Use Mechanical Quality Gates For Code And Meta Docs

## Context

Situ's code and `.agents` layer are both part of the product. If docs, ADRs,
skills, scripts, and policies rot, agents lose the ability to work from current
state.

Classic Situ used a set of focused mechanical tools: formatters, linters,
spell-checking, markdown linting, GitHub Actions linting, dependency audit, and
Fallow analysis. The useful lesson is the focused-tool pattern, not the exact
weight of the old policy layer.

## Decision

Situ will use focused mechanical quality gates for code and meta docs.

Baseline tools include:

- formatter and TypeScript/JavaScript linter
- TypeScript 7 typechecking through `@typescript/native-preview` and `tsgo -b`
- package and app tests
- `markdownlint-cli2` for markdown structure
- `typos` for prose and identifier spell-checking
- `actionlint` for GitHub Actions workflows
- `fallow` for dead code, duplication, complexity, and architecture signals
- `bun audit` for dependency vulnerability checks
- Drizzle migration checks once migrations exist

`mise run check` is the main green-path gate. Tools with noisy or exploratory
output can remain separate or informational until the baseline is clean.

Prefer small tools with clear ownership over one large meta-runner that hides
which rule failed.

TypeScript configuration should stay compatible with TypeScript 7. In
particular, do not use `baseUrl`; path aliases should use explicit relative
targets instead. Generated typecheck artifacts such as `dist/` and
`*.tsbuildinfo` are build output, not source.

## Consequences

Agents should run the narrowest relevant check while iterating, then `mise run
check` before handing off broad changes.

Docs and ADR changes should pass markdownlint and typos.

Tool exceptions belong in tool config with a short reason. If a tool points at
a real recurring issue, fix the code or docs rather than suppressing the tool.

Fallow and coverage can guide cleanup without becoming hard gates before the
project has a stable baseline.

## Related

- ADR 0007: Use Mise As The Repo Command Surface
- ADR 0008: Keep Repository Scripts Thin And Boring
- ADR 0040: Test Packages At Their Boundaries
