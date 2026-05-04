# Policies

Policies are review rubrics for future changes. They translate the product specs
into concrete checks.

Read the relevant policies before changing product behavior, architecture, UI,
or agent/worker flows.

## Policy Index

- [0001-product-scope/POLICY.md](./0001-product-scope/POLICY.md) - keep Almanac focused on terminal observability
- [0002-local-first/POLICY.md](./0002-local-first/POLICY.md) - preserve private local state by default
- [0003-live-observability/POLICY.md](./0003-live-observability/POLICY.md) - keep the TUI focused on live run state
- [0004-guardrails/POLICY.md](./0004-guardrails/POLICY.md) - keep first automated trust checks slim and concrete
- [0005-primitives/POLICY.md](./0005-primitives/POLICY.md) - use the product nouns consistently
- [0006-agent-boundaries/POLICY.md](./0006-agent-boundaries/POLICY.md) - keep Almanac distinct from workers and coding agents
- [0007-mvp-discipline/POLICY.md](./0007-mvp-discipline/POLICY.md) - keep the first slice narrow but durable
- [0008-docs-before-code/POLICY.md](./0008-docs-before-code/POLICY.md) - update specs before product-significant code
- [0009-good-specs/POLICY.md](./0009-good-specs/POLICY.md) - define the writing bar for specs
- [0010-evidence-backed-findings/POLICY.md](./0010-evidence-backed-findings/POLICY.md) - keep findings grounded in evidence
- [0011-repository-layer/POLICY.md](./0011-repository-layer/POLICY.md) - keep durable state access repository-owned
- [0012-module-organization/POLICY.md](./0012-module-organization/POLICY.md) - prefer small files with clear ownership folders

## Review Style

When reviewing a change, ask:

1. Does it help answer "is this research going well?"
2. Does it preserve local/private defaults?
3. Does it improve terminal observability, evidence capture, or findings?
4. Does it avoid expanding scope before the MVP loop is solid?
5. Does it keep agents/workers separate from durable run state?

## Format

Policies live in numbered directories:

```text
.agents/policies/0001-some-name/POLICY.md
```

Use the next zero-padded number when adding a policy.
