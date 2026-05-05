---
title: Real LLM Evals
status: active
---

# Policy: Real LLM Evals

## Applies To

AI eval suites under `evals/`, test suites under `projects/*/tests`, and any
new command or CI workflow that runs Situ checks.

## Rule

Unit and integration tests should be deterministic. Evals should exercise real
LLM behavior.

Tests answer:

```text
Did the deterministic code path work?
```

Evals answer:

```text
Did the live model use the tools, hypotheses, experiment activities, artifacts,
and concerns correctly?
```

## Required Checks

- Do not replace evals with `TestModel`, hardcoded model outputs, or fully
  scripted task behavior.
- Use fixture worlds to control the environment, not to pre-script the agent's
  choices.
- Make eval execution fail clearly when required model credentials are missing.
- Eval discovery and listing may run without model or Logfire credentials, but
  executing cases must require the relevant secrets.
- Keep deterministic assertions in tests when no LLM judgment is needed.
- Prefer deterministic evaluators around live LLM runs before adding LLM judges.
- Use LLM judges only for semantic quality checks that deterministic assertions
  cannot reasonably capture.
- Keep eval runs opt-in from regular test commands unless the command name makes
  LLM/network usage explicit.

## Acceptable Fixtures

Fixture worlds may provide:

- Stable tool responses.
- Mocked external systems.
- Synthetic result comments and signals.
- Suspicious or malformed result cases.

Fixture worlds must not replace the model's decision-making path in an AI eval.

## Red Flags

- An eval passes without making a real model call.
- An eval asserts only hardcoded fixture output rather than model behavior.
- A normal unit test requires an API key or network access.
- Missing credentials silently fall back to deterministic behavior.
- The eval checks a rigid schema instead of tool use, activity grounding, or
  semantic behavior.
