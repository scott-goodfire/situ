---
status: accepted
implementation_status: verified
created: 2026-05-12
---

# 0016. Codify Style With Tools Before Policy

## Context

Consistency is critical when many agents edit the same codebase. Style written
only in prose is easy to miss, but too much custom tooling can become its own
maintenance burden.

## Decision

Situ will enforce style with existing tools before adding policy text or custom
scripts.

Preference order:

1. formatter
2. existing linter rule
3. small deterministic repo script
4. ADR or package README guidance
5. human review

Custom scripts are appropriate when they enforce a small local invariant that
general tools cannot see, such as rejecting unstructured product errors or
checking ADR cross-references.

Policy text should point to concrete ADRs and commands. It should not duplicate
long style guides.

## Consequences

When a style preference can be represented in oxlint, markdownlint, typos,
Fallow, or a focused script, add the rule or script.

When a rule is only a preference, start as a warning or local audit before
making it a hard gate.

Exceptions should be local and explained. A disabled lint rule without a reason
is treated as drift.

## Related

- ADR 0008: Keep Repository Scripts Thin And Boring
- ADR 0011: Use Mechanical Quality Gates For Code And Meta Docs
- ADR 0014: Use Readable TypeScript Conventions
