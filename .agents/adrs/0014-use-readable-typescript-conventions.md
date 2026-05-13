---
status: accepted
implementation_status: implemented
created: 2026-05-12
---

# 0014. Use Readable TypeScript Conventions

## Context

Situ will depend on agents making many small changes. Style should reduce
cognitive load and make code searchable. The goal is not clever TypeScript; the
goal is obvious TypeScript that lets a reader find concepts quickly.

## Decision

Situ will prefer readable TypeScript conventions.

Default conventions:

- exported functions, public helpers, and public classes get brief multiline doc
  comments
- functions take one object argument unless there is a clear local reason not to
- prefer guard clauses and early returns over nested conditionals
- avoid ternaries when the branches contain meaningful logic; never use nested
  ternaries
- prefer small files and small functions over large files with many unrelated
  helpers
- leave useful vertical whitespace between logical steps
- use explicit names over dense abbreviations
- avoid type assertions when a narrower type can be produced by control flow
- keep public types close to the package that owns the concept

Repository methods and app actions should be object-argument APIs. For example:

```ts
tasks.require({ id: taskId });
notifications.listWakeableByRecipient({ recipientId: agentId });
actions.assignTask({ taskId, assignee, actor });
```

## Consequences

Agents should split files when a module stops being easy to scan.

Doc comments should name what a function does, not repeat the signature or
explain obvious internals. Prefer short multiline comments:

```ts
/**
 * Compares two ISO timestamps.
 */
```

They are especially useful for exported functions, app actions, repository
factories, and policy helpers that future agents may search for by concept.

Code review should treat unnecessary nesting, dense ternaries, and positional
argument APIs as maintainability issues.

Tooling should enforce the parts it can enforce, such as no nested ternaries and
throwing structured errors. ADRs and reviews cover the judgment calls tooling
cannot express cleanly.

## Related

- ADR 0000: Use Simple Agent-First Decision Heuristics
- ADR 0011: Use Mechanical Quality Gates For Code And Meta Docs
- ADR 0022: Define Common Package Contract
