# Almanac Product Specs

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

## Product Thesis

Autoresearch makes agents willing to try many experiments. Almanac makes a
running session observable from the terminal.

The product should answer:

> What is running, which hypotheses are active, what experiments are being
> tried, what evaluations came back, what activity was recorded, what artifacts
> can be inspected, and what is the system learning?

The first slice should be intentionally slim. Live guidance, final reports,
broad health scoring, directions, and standalone decision/finding/warning
models are deferred until the terminal loop is useful. The first web surface is
attach-only observability over an already-running local session.

## Spec Discipline

Specs should stay product-shaped. They can define runtime boundaries and
required guarantees, but they should avoid prematurely locking in database
schemas, framework choices, or internal abstractions.

When implementation reveals a better product shape, update the spec first.

## Format

Specs live in numbered directories:

```text
.agents/specs/0001-some-name/SPEC.md
```

Use the next zero-padded number when adding a spec. See
[../policies/0009-good-specs/POLICY.md](../policies/0009-good-specs/POLICY.md)
for the writing bar.
