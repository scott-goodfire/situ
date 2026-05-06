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
LLM behavior. For evals, realism is more important than minimizing model cost.

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
- Prefer the most realistic workflow that fits the behavior under review, even
  when it is slower or uses more model calls. Cost is a budgeting concern, not
  a reason to reduce a workflow eval to isolated tool calls.
- When behavior depends on multiple agents coordinating, add an integrated
  multi-agent eval that runs the real agent entrypoints and task queue. It is
  fine to also keep smaller manager-only and scientist-only cases, but they do
  not replace the full loop.
- Bound evals by observable stopping conditions such as max planning passes,
  max claimed tasks, or expected ledger outputs. Do not make them cheaper by
  scripting the agent decision path.
- Make eval execution fail clearly when required model credentials are missing.
- Eval discovery and listing may run without model or Logfire credentials, but
  executing cases must require the relevant secrets.
- Keep deterministic assertions in tests when no LLM judgment is needed.
- Prefer deterministic evaluators around live LLM runs before adding LLM judges.
- Use LLM judges only for semantic quality checks that deterministic assertions
  cannot reasonably capture.
- Keep eval runs opt-in from regular test commands unless the command name makes
  LLM/network usage explicit.
- Record enough trace data, tool calls, events, and final ledger state to debug
  a realistic failed run without re-running it immediately.

## Acceptable Fixtures

Fixture worlds may provide:

- Stable tool responses.
- Mocked external systems.
- Synthetic result comments and signals.
- Suspicious or malformed result cases.

Fixture worlds must not replace the model's decision-making path in an AI eval.
They should preserve realistic sequencing when that sequencing is the behavior
being evaluated, such as Manager planning, Scientist claiming work, workspace
inspection, command execution, ledger writes, and Manager replanning.

## Red Flags

- An eval passes without making a real model call.
- An eval asserts only hardcoded fixture output rather than model behavior.
- A normal unit test requires an API key or network access.
- Missing credentials silently fall back to deterministic behavior.
- A multi-agent behavior is only covered by isolated single-tool or
  single-agent evals.
- An eval avoids real workspace inspection, command execution, or task-queue
  transitions when those are central to the product behavior being tested.
- Cost or runtime is used as the main reason to remove realistic agent
  coordination from an eval. If cost matters for a command, split fast and full
  eval commands rather than weakening the full eval.
- The eval checks a rigid schema instead of tool use, activity grounding, or
  semantic behavior.
