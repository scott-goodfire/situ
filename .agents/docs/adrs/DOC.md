# ADR Conventions

This document defines how Situ records architecture decisions.

ADRs live in `.agents/adrs/`. This documentation file explains the convention;
it is not itself an ADR.

```text
.agents/
  adrs/
    0001-use-linear-like-primitives-over-workflows.md
    0002-make-humans-summary-first-and-agents-board-first.md
    0003-use-notifications-as-agent-inbox-and-wake-trigger.md
  docs/
    adrs/
      DOC.md
    architecture/
      DOC.md
```

## Purpose

An Architecture Decision Record captures one important decision, the context
that made the decision necessary, and the consequences of choosing it.

Use ADRs for durable architecture choices:

- product model and user experience direction
- high-level implementation framework and codebase structure
- backend package boundaries
- data model decisions
- runtime and agent coordination decisions
- sync/API shape
- decisions that constrain future implementation work

ADRs should progressively narrow the decision space. Early ADRs make the broad
product and infrastructure bets. Later ADRs are scoped by those decisions and
become more specific.

Do not use ADRs as task checklists. ADRs should still be specific enough that an
agent can read them in order and understand how to implement the resulting app.
Detailed local contracts belong in package READMEs, package specs, tests, or
ordinary tasks.

## Relationship To Other Docs

```text
.agents/docs/architecture/DOC.md
  Current end-state architecture snapshot.

.agents/adrs/*.md
  Historical decision log. Explains why the architecture is shaped that way.

projects/app/packages/*/README.md
  Package-local ownership, invariants, repository APIs, and test expectations.

projects/app/packages/*/SPEC.md
  Optional detailed package behavior spec when a README becomes too crowded.
```

The architecture doc should reflect the current accepted direction. ADRs explain
how and why that direction was chosen.

## Ordering Principle

ADRs should be ordered so a reader can stop part way through and still have a
coherent, implementable slice of the architecture.

The sequence should move from broad constraints to narrow contracts:

```text
Problem and product shape
  -> human and agent experience
  -> implementation framework and technology bets
  -> codebase/package structure
  -> core primitives and data model
  -> runtime mechanics
  -> package-specific contracts
  -> testing and verification
```

The earliest ADRs should make the largest narrowing decisions. Later ADRs should
not introduce assumptions that should have been established earlier. For
example, package-specific ADRs should come after decisions about package
boundaries, schema ownership, app actions, and sync shape.

The goal is reproducibility. In principle, an agent should be able to read the
ADR series from `0001` onward, implement each accepted decision, and end up with
an app that matches the architecture doc.

## Implementability Standard

Each ADR should narrow the space enough that later implementation decisions are
easier, not harder.

A good ADR answers:

- what problem or force created the decision
- what decision was made
- what concepts, APIs, packages, or records are introduced
- what concepts are explicitly not introduced
- what later decisions now depend on this one
- what a future implementation must preserve

An ADR does not need to include full code, but it should include enough concrete
language that an agent can apply it without guessing the intended architecture.

For example, a package-boundary ADR should say where code lives, what the app
package owns, what primitive packages own, and how package docs/specs should be
used. A later package-specific spec can then focus on tables, repositories,
mutations, sync keys, invariants, and tests.

## File Naming

ADR files use monotonically increasing four-digit numbers and short kebab-case
titles:

```text
0001-use-linear-like-primitives-over-workflows.md
0002-make-humans-summary-first-and-agents-board-first.md
0003-use-notifications-as-agent-inbox-and-wake-trigger.md
```

Do not renumber ADRs after they are created. If a decision changes, create a new
ADR that explains the new decision. Keep the metadata simple; cross-link related
ADRs in the body when helpful.

## Frontmatter

Every ADR starts with YAML frontmatter.

```yaml
---
status: accepted
implementation_status: not_started
created: 2026-05-12
---
```

`status` describes the decision lifecycle.

Allowed values:

- `proposed`
- `accepted`
- `rejected`
- `deprecated`

`implementation_status` describes whether the codebase has caught up to the
decision.

Allowed values:

- `not_started`
- `in_progress`
- `partially_implemented`
- `implemented`
- `verified`
- `not_applicable`

Use `not_applicable` for experience or principle ADRs that set direction but do
not correspond to a specific implementation change.

`created` is the date the ADR file was created, in `YYYY-MM-DD` format.

## Template

```md
---
status: proposed
implementation_status: not_started
created: YYYY-MM-DD
---

# 0000. Short Decision Title

## Context

What forces, goals, constraints, or tradeoffs made this decision necessary?

## Decision

What are we deciding?

## Consequences

What becomes easier, harder, or constrained because of this decision?

## Alternatives Considered

Optional. Include only when the alternatives explain the decision.

## Related

- Architecture: `.agents/docs/architecture/DOC.md`
- Package spec: `projects/app/packages/<name>/README.md`
```

## Status Guidance

Use `proposed` while the team is still discussing the decision.

Use `accepted` once the decision should guide future implementation.

Use `rejected` when the ADR records an option the team considered and decided
not to adopt.

Use `deprecated` when the decision is still historically true but should no
longer guide new work.

## Implementation Status Guidance

Decision status and implementation status are intentionally separate.

```text
status = have we made the decision?
implementation_status = has the codebase caught up?
```

Examples:

```yaml
status: accepted
implementation_status: not_applicable
```

Use this for principle ADRs such as "Use Linear-like primitives over workflows."

```yaml
status: accepted
implementation_status: not_started
```

Use this for implementation-driving ADRs that have been accepted but not built.

```yaml
status: accepted
implementation_status: partially_implemented
```

Use this when part of the architecture exists but important contracts are still
missing.

```yaml
status: accepted
implementation_status: verified
```

Use this when the behavior is implemented and covered by the expected tests or
evals.

## Scope

Prefer central ADRs in `.agents/adrs/` rather than per-package ADR folders.
Many important decisions cut across packages, sync, tools, scheduler behavior,
and UI expectations.

Package-local details belong in package docs:

```text
.agents/adrs/0007-use-notifications-as-agent-inbox-and-wake-trigger.md
  Why notifications exist and what role they play in the architecture.

projects/app/packages/notifications/README.md
  Notification tables, repository functions, mutations, sync keys, invariants,
  and tests.
```

Introduce nested ADR directories only if a subsystem becomes independently
maintained and has its own long-lived architectural history.
