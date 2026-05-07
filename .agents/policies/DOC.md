# Policies

Policies are review rubrics for future changes. They translate the product specs
into concrete checks.

Read the relevant policies before changing product behavior, architecture, UI,
or agent/worker flows.

## Policy Index

- [0001-product-scope/POLICY.md](./0001-product-scope/POLICY.md) - keep Situ focused on terminal session observability
- [0002-local-first/POLICY.md](./0002-local-first/POLICY.md) - preserve private local state by default
- [0003-live-observability/POLICY.md](./0003-live-observability/POLICY.md) - keep the TUI focused on live session state
- [0004-guardrails/POLICY.md](./0004-guardrails/POLICY.md) - keep first automated trust checks slim and concrete
- [0005-primitives/POLICY.md](./0005-primitives/POLICY.md) - use the product nouns consistently
- [0006-agent-boundaries/POLICY.md](./0006-agent-boundaries/POLICY.md) - keep Situ distinct from workers and coding agents
- [0007-slice-discipline/POLICY.md](./0007-slice-discipline/POLICY.md) - keep the current slice narrow but durable
- [0008-docs-before-code/POLICY.md](./0008-docs-before-code/POLICY.md) - update specs before product-significant code
- [0009-good-specs/POLICY.md](./0009-good-specs/POLICY.md) - define the writing bar for specs
- [0010-activity-grounding/POLICY.md](./0010-activity-grounding/POLICY.md) - keep activities and measurement evidence grounded in research records and artifacts
- [0011-repository-layer/POLICY.md](./0011-repository-layer/POLICY.md) - keep durable state repository-owned and API composition service-owned
- [0012-module-organization/POLICY.md](./0012-module-organization/POLICY.md) - prefer flat entrypoints and generic filenames inside ownership folders
- [0013-frontend-code-style/POLICY.md](./0013-frontend-code-style/POLICY.md) - prefer explicit, spacious, kebab-cased frontend code
- [0014-real-llm-evals/POLICY.md](./0014-real-llm-evals/POLICY.md) - keep tests deterministic and evals realistic with real model calls
- [0015-secrets-only-env/POLICY.md](./0015-secrets-only-env/POLICY.md) - keep user-facing env vars limited to secrets
- [0016-ui-snapshot-artifacts/POLICY.md](./0016-ui-snapshot-artifacts/POLICY.md) - keep UI snapshots fixture-driven, disposable, and comparable across text, ANSI, and PNG artifacts
- [0017-agent-tool-surface/POLICY.md](./0017-agent-tool-surface/POLICY.md) - keep agent tools explicit, model-shaped, and action-specific
- [0018-headless-interactive-siblings/POLICY.md](./0018-headless-interactive-siblings/POLICY.md) - keep TUI/web and headless automation as sibling surfaces over the same backend
- [0019-dbos-agent-execution/POLICY.md](./0019-dbos-agent-execution/POLICY.md) - prefer Pydantic AI DBOSAgent over custom agent workflow orchestration
- [0020-experiment-comparability/POLICY.md](./0020-experiment-comparability/POLICY.md) - make workspace state, eval commands, and changed evaluation surfaces visible before trusting experiment results
- [0021-model-formality/POLICY.md](./0021-model-formality/POLICY.md) - formalize identities, relationships, statuses, gates, and contracts while keeping semantic research content text-rich
- [0022-durable-records/POLICY.md](./0022-durable-records/POLICY.md) - keep persisted product records storage-agnostic, typed where software needs guarantees, and text-rich where research semantics are flexible
- [0023-api-services-schemas/POLICY.md](./0023-api-services-schemas/POLICY.md) - keep API services responsible for read-side composition and boundary-shaped schemas
- [0024-eval-worlds-suites/POLICY.md](./0024-eval-worlds-suites/POLICY.md) - keep eval fixture worlds separate from behavior suites while preserving realistic model behavior
- [0025-runtime-skills/POLICY.md](./0025-runtime-skills/POLICY.md) - keep Situ runtime-agent skills separate from developer-agent skills and tied to explicit record tools
- [0026-experiment-workspaces/POLICY.md](./0026-experiment-workspaces/POLICY.md) - run candidate experiment work in managed workspaces and preserve comparable code-state evidence
- [0027-convention-policy-coverage/POLICY.md](./0027-convention-policy-coverage/POLICY.md) - require policy coverage for repeated backend conventions with three or more examples
- [0028-protocol-generation/POLICY.md](./0028-protocol-generation/POLICY.md) - keep Python protocol models as the source of truth and generated TypeScript/JSON Schema in sync
- [0029-typescript-workspace-packages/POLICY.md](./0029-typescript-workspace-packages/POLICY.md) - preserve TypeScript workspace package boundaries, exports, checks, and dependency direction
- [0030-frontend-collections-selectors/POLICY.md](./0030-frontend-collections-selectors/POLICY.md) - keep frontend live state collection-backed and read-side derivations in selectors
- [0031-ui-package-boundaries/POLICY.md](./0031-ui-package-boundaries/POLICY.md) - keep design tokens, reusable UI, app UI, and live app wiring in separate package layers
- [0032-command-task-surface/POLICY.md](./0032-command-task-surface/POLICY.md) - keep routine workflows discoverable through strict command wrappers and mise tasks

## Review Style

When reviewing a change, ask:

1. Does it help answer "what is happening in this research session?"
2. Does it preserve local/private defaults?
3. Does it improve terminal observability, activities, artifacts, or hypotheses?
4. Does it avoid expanding scope before the current loop is solid?
5. Does it keep agents/workers separate from durable Situ state?

## Format

Policies live in numbered directories:

```text
.agents/policies/0001-some-name/POLICY.md
```

Use the next zero-padded number when adding a policy.
