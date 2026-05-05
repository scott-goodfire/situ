# Policies

Policies are review rubrics for future changes. They translate the product specs
into concrete checks.

Read the relevant policies before changing product behavior, architecture, UI,
or agent/worker flows.

## Policy Index

- [0001-product-scope/POLICY.md](./0001-product-scope/POLICY.md) - keep Almanac focused on terminal session observability
- [0002-local-first/POLICY.md](./0002-local-first/POLICY.md) - preserve private local state by default
- [0003-live-observability/POLICY.md](./0003-live-observability/POLICY.md) - keep the TUI focused on live session state
- [0004-guardrails/POLICY.md](./0004-guardrails/POLICY.md) - keep first automated trust checks slim and concrete
- [0005-primitives/POLICY.md](./0005-primitives/POLICY.md) - use the product nouns consistently
- [0006-agent-boundaries/POLICY.md](./0006-agent-boundaries/POLICY.md) - keep Almanac distinct from workers and coding agents
- [0007-slice-discipline/POLICY.md](./0007-slice-discipline/POLICY.md) - keep the current slice narrow but durable
- [0008-docs-before-code/POLICY.md](./0008-docs-before-code/POLICY.md) - update specs before product-significant code
- [0009-good-specs/POLICY.md](./0009-good-specs/POLICY.md) - define the writing bar for specs
- [0010-activity-grounding/POLICY.md](./0010-activity-grounding/POLICY.md) - keep activities grounded in experiments, hypotheses, and artifacts
- [0011-repository-layer/POLICY.md](./0011-repository-layer/POLICY.md) - keep durable state repository-owned and API composition service-owned
- [0012-module-organization/POLICY.md](./0012-module-organization/POLICY.md) - prefer flat entrypoints and generic filenames inside ownership folders
- [0013-frontend-code-style/POLICY.md](./0013-frontend-code-style/POLICY.md) - prefer explicit, spacious, kebab-cased frontend code
- [0014-real-llm-evals/POLICY.md](./0014-real-llm-evals/POLICY.md) - keep tests deterministic and evals backed by real model calls
- [0015-secrets-only-env/POLICY.md](./0015-secrets-only-env/POLICY.md) - keep user-facing env vars limited to secrets
- [0016-ui-snapshot-artifacts/POLICY.md](./0016-ui-snapshot-artifacts/POLICY.md) - keep UI snapshots fixture-driven, disposable, and comparable across text, ANSI, and PNG artifacts
- [0017-agent-tool-surface/POLICY.md](./0017-agent-tool-surface/POLICY.md) - keep agent tools explicit, model-shaped, and action-specific
- [0018-headless-interactive-siblings/POLICY.md](./0018-headless-interactive-siblings/POLICY.md) - keep TUI/web and headless automation as sibling surfaces over the same backend
- [0019-dbos-agent-execution/POLICY.md](./0019-dbos-agent-execution/POLICY.md) - prefer Pydantic AI DBOSAgent over custom agent workflow orchestration

## Review Style

When reviewing a change, ask:

1. Does it help answer "what is happening in this research session?"
2. Does it preserve local/private defaults?
3. Does it improve terminal observability, activities, artifacts, or hypotheses?
4. Does it avoid expanding scope before the current loop is solid?
5. Does it keep agents/workers separate from durable session state?

## Format

Policies live in numbered directories:

```text
.agents/policies/0001-some-name/POLICY.md
```

Use the next zero-padded number when adding a policy.
