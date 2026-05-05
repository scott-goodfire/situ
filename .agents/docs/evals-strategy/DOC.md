# Evals Strategy

This repo should use evals to improve Situ's prompts, tool-calling behavior,
observability, and trust checks over time. Unlike unit tests, evals should run
real LLM calls against controlled fixture worlds.

The eval layer should stay close to the product thesis:

```text
Can Situ help a human or agent understand what is happening in an
autoresearch session and whether the activity is trustworthy?
```

## Shape

Use a code-first eval harness with explicit fixture worlds, evaluators, eval
groups, and runner code:

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

Suite paths should make the evaluated surface obvious:

```text
evals/suites/tools/<tool-surface>/
evals/suites/agents/<agent-name>/<world-or-workflow>/
```

Use `tools/...` for LLM tool affordance coverage and `agents/...` for real
agent behavior in a fixture world.

The eval/test boundary is defined by
[../../policies/0014-real-llm-evals/POLICY.md](../../policies/0014-real-llm-evals/POLICY.md):
tests are deterministic, while evals exercise live model behavior.

## Harness Practices

Follow Pydantic Evals and Logfire defaults where they fit:

- Configure Logfire before eval task execution. Eval discovery and `--list`
  should not require model or Logfire credentials.
- Send eval runs to Logfire by default; eval commands should not require a
  per-run send-mode override.
- Load only eval secrets from user environment: `SITU_OPENAI_KEY` for the
  model call and `SITU_LOGFIRE_TOKEN` for Logfire export.
- Keep model names, service names, environments, retry defaults, and timeouts
  in typed code config unless they become real product settings.
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
- Keep `StandardSituJudge` available for semantic checks, but do not make LLM
  judges the default for mechanical behavior.
- Do not force model settings that the configured model rejects; prefer model
  defaults unless an eval has proven it needs a supported override.
- For Pydantic AI agents, capture tool calls with hook/capability utilities
  rather than ad hoc wrappers.

## What To Evaluate

Prefer behavioral evals over schema evals.

Good first targets:

- The planner starts with baseline result activity.
- The full research agent can inspect an unfamiliar local repo, discover the
  project-native measurement command, run it, and record plaintext baseline
  evidence before candidate experiments.
- The planner explores simple variants before over-committing.
- The planner combines promising hypothesis/experiment activity.
- The research-tool agent reads compact session context with `get_session`.
- The research-tool agent uses explicit model-shaped tools for hypotheses,
  experiments, links, comments, activities, and artifacts.
- Suspicious wins are not treated as accepted progress.
- Interpretations are grounded in recorded activities and artifacts.
- Tool calls happen in a sensible order.
- Logfire spans and Situ events expose the execution path.

Avoid evals that only check whether a rigid proposal object has the right
fields. Situ's agent-facing layer should keep semantics loose and text-rich,
while typed envelopes preserve execution and observability guarantees.

## Worlds

A world is a fixture-backed simulation of the thing Situ is researching.

Initial worlds:

- `research_session`: temporary SQLite session worlds seeded with objective,
  session, hypothesis, experiment, activity, and artifact state. This world
  exercises the actual Situ research toolset through Pydantic AI for both
  focused tool affordance evals and full-agent `ResearchAgent` evals.
- `repo_bootstrap`: a temporary local fixture repo shaped like a tiny
  autoresearch project. This world exercises the real `ResearchAgent` with both
  Situ ledger tools and workspace tools, checking whether it can infer the
  native measurement loop, establish baseline evaluation evidence, run bounded
  candidate measurements, and avoid modifying setup/evaluation-surface code.

Future worlds may add heavier sandbox repos when the deterministic local
fixture worlds are not enough.

## Logfire

Evals should report to Logfire by default. Use descriptive service names,
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
