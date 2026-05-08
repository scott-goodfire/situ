# Situ Product Specs

These specs are the product contract for this repo. They should guide design,
implementation, review, and future agent work.

Read in this order:

1. [0001-north-star/SPEC.md](./0001-north-star/SPEC.md)
2. [0002-active-vertical-slice/SPEC.md](./0002-active-vertical-slice/SPEC.md)
3. [0003-product-primitives/SPEC.md](./0003-product-primitives/SPEC.md)
4. [0004-user-flows/SPEC.md](./0004-user-flows/SPEC.md)
5. [0005-live-observability/SPEC.md](./0005-live-observability/SPEC.md)
6. [0006-guardrails/SPEC.md](./0006-guardrails/SPEC.md)
7. [0007-tui/SPEC.md](./0007-tui/SPEC.md)
8. [0008-agent-facing-context/SPEC.md](./0008-agent-facing-context/SPEC.md)
9. [0009-architecture-intent/SPEC.md](./0009-architecture-intent/SPEC.md)
10. [0010-activities-and-artifacts/SPEC.md](./0010-activities-and-artifacts/SPEC.md)
11. [0011-local-session-web/SPEC.md](./0011-local-session-web/SPEC.md)
12. [0012-experiment-workspace-state/SPEC.md](./0012-experiment-workspace-state/SPEC.md)
13. [0013-agent-task-coordination/SPEC.md](./0013-agent-task-coordination/SPEC.md)
14. [0014-local-app-runtime/SPEC.md](./0014-local-app-runtime/SPEC.md)
15. [0015-experiment-lineage-portfolio-search/SPEC.md](./0015-experiment-lineage-portfolio-search/SPEC.md)
16. [0016-task-work-types-and-reviews/SPEC.md](./0016-task-work-types-and-reviews/SPEC.md)
17. [0017-distribution-and-install/SPEC.md](./0017-distribution-and-install/SPEC.md)

## Product Thesis

Autoresearch makes agents willing to try many experiments. Situ makes a
running session observable from the terminal.

The product should answer:

> What is running, which hypotheses are active, what experiments are being
> tried, what measurements came back, what activity was recorded, what
> artifacts can be inspected, and what is the system learning?

Situ is intentionally slim. Live guidance, final reports, broad health
scoring, directions, and standalone decision/finding/warning models are
out of scope until the terminal loop is useful on its own. The local app
runtime is the control plane for terminal and web observability surfaces.

## Spec Discipline

Specs are end-state contracts. They can define runtime boundaries and
required guarantees, but they should avoid prematurely locking in database
schemas, framework choices, or internal abstractions, and they should not
contain implementation plans, migration recipes, or "first slice / later
slice" timelines. Agents derive deltas from current code against the spec.

When implementation reveals a better product shape, update the spec first.

## Format

Specs live in numbered directories:

```text
.agents/specs/0001-some-name/SPEC.md
```

Use the next zero-padded number when adding a spec. See
[../policies/0009-good-specs/POLICY.md](../policies/0009-good-specs/POLICY.md),
[../policies/0033-specs-as-end-state/POLICY.md](../policies/0033-specs-as-end-state/POLICY.md),
and
[../policies/0034-specs-describe-what-is/POLICY.md](../policies/0034-specs-describe-what-is/POLICY.md)
for the writing bar.
