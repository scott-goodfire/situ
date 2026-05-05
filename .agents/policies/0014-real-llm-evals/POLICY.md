---
title: Real LLM Evals
status: active
---

# Policy: Real LLM Evals

## Applies To

AI eval suites under `evals/`, test suites under `projects/*/tests`, and any
new command or CI workflow that runs Almanac checks.

## Rule

Unit and integration tests should be deterministic. AI evals should exercise
real LLM behavior.

Tests answer:

```text
Did the deterministic code path work?
```

AI evals answer:

```text
Did the live model use the tools, evidence, warnings, and findings correctly?
```

## Required Checks

- Do not replace AI evals with `TestModel`, hardcoded model outputs, or fully
  scripted task behavior.
- Use fixture worlds to control the environment, not to pre-script the agent's
  choices.
- Make evals fail clearly when required model credentials are missing.
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
- Synthetic evidence and signals.
- Suspicious or malformed evidence cases.

Fixture worlds must not replace the model's decision-making path in an AI eval.

## Red Flags

- An eval passes without making a real model call.
- An eval asserts only hardcoded fixture output rather than model behavior.
- A normal unit test requires an API key or network access.
- Missing credentials silently fall back to deterministic behavior.
- The eval checks a rigid schema instead of tool use, evidence grounding, or
  semantic behavior.
