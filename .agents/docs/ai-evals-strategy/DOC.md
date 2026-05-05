# AI Evals Strategy

This repo should use AI evals to improve Almanac's prompts, tool-calling
behavior, observability, and trust checks over time. Unlike unit tests, AI evals
should run real LLM calls against controlled fixture worlds.

The eval layer should stay close to the product thesis:

```text
Can Almanac help a human or agent understand whether an autoresearch run is
making trustworthy progress?
```

## Shape

Use a code-first eval harness inspired by the Mem backend `ai_evals/` pattern,
adapted here as:

```text
evals/
  harness/  shared eval envelopes, evaluators, eval groups, and Logfire setup
  runner/   CLI discovery, execution, and reporting
  worlds/   fixture-backed simulated research worlds
  suites/   concrete eval groups and cases
```

Eval suites should define cases in code first. Fixture worlds can live beside
the suites when the case needs a mocked project, worker, or external system.
Follow the module organization policy: small ownership folders are preferred
over broad files like `models.py`, `evaluators.py`, or mixed world/suite files.

The eval/test boundary is defined by
[../../policies/0014-real-llm-evals/POLICY.md](../../policies/0014-real-llm-evals/POLICY.md):
tests are deterministic, while AI evals exercise live model behavior.

## Harness Practices

Follow Pydantic Evals and Logfire defaults where they fit:

- Configure Logfire before eval discovery and task execution.
- Send eval runs to Logfire by default; eval commands should not require a
  per-run `ALMANAC_LOGFIRE_SEND_TO_LOGFIRE=always` override.
- Use `Dataset.evaluate_sync` for the local synchronous runner.
- Require real model credentials for AI eval execution; missing credentials
  should fail clearly instead of falling back to scripted behavior.
- Record numeric counters with `increment_eval_metric`.
- Record small case-level context with `set_eval_attribute`; avoid large raw
  blobs in attributes.
- Prefer deterministic evaluators first.
- Add span-based evaluators when the behavior depends on tool calls or execution
  path, so eval assertions match production observability.
- Use native Pydantic Evals retry knobs for transient LLM/tool failures.
- Keep `StandardAlmanacJudge` available for semantic checks, but do not make LLM
  judges the default for mechanical behavior.
- Do not force model settings that the configured model rejects; prefer model
  defaults unless an eval has proven it needs a supported override.
- For Pydantic AI agents, capture tool calls with hook/capability utilities
  rather than ad hoc wrappers.

## What To Evaluate

Prefer behavioral evals over schema evals.

Good first targets:

- The planner starts with baseline evidence.
- The planner explores simple variants before over-committing.
- The planner combines promising findings.
- Suspicious wins are not treated as accepted progress.
- Findings are grounded in recorded evidence.
- Tool calls happen in a sensible order.
- Logfire spans and Almanac events expose the execution path.

Avoid evals that only check whether a rigid proposal object has the right
fields. Almanac's agent-facing layer should keep semantics loose and text-rich,
while typed envelopes preserve execution and observability guarantees.

## Worlds

A world is a fixture-backed simulation of the thing Almanac is researching.

Initial world:

- `micrograd`: baseline, variants, combinations, and suspicious evidence based
  on the existing micrograd sandbox.

Future worlds can include `toy_autoresearch` for even faster synthetic local
smoke tests. Worlds may be fully mocked at first. Later, they can call real
local eval commands or sandbox repos.

## Logfire

AI evals should report to Logfire by default. Use descriptive service names,
experiment names, and metadata so eval runs are searchable.

Recommended metadata:

- suite
- world
- model
- git sha
- case

## Extension Rule

When adding an eval, include:

- A clear case name.
- The mocked or real world state.
- The behavior being exercised.
- Deterministic evaluators where possible.
- LLM judges only when the expected quality is genuinely semantic.

The first evals should be small enough to run often. Broader, slower, or
LLM-heavy eval suites can be added after the deterministic harness is useful.
