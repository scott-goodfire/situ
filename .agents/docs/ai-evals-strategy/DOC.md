# AI Evals Strategy

This repo should use AI evals to improve Almanac's prompts, tool-calling
behavior, observability, and trust checks over time.

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
  harness/
  worlds/
  suites/
```

Eval suites should define cases in code first. Fixture worlds can live beside
the suites when the case needs a mocked project, worker, or external system.

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

AI evals should report to Logfire when `ALMANAC_LOGFIRE_TOKEN` or
`LOGFIRE_TOKEN` is present. Use descriptive service names, experiment names, and
metadata so eval runs are searchable.

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
