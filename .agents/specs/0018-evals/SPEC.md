# Evals

The eval surface measures live agent behavior against controlled fixture
worlds. It is the primary way Situ verifies that real model calls produce
correct tool use, durable records, and observable signals.

This spec defines the end-state shape of the eval surface — case format,
evaluator pattern, world boundary, and where eval definitions live.
[../../policies/0014-real-llm-evals/POLICY.md](../../policies/0014-real-llm-evals/POLICY.md)
defines the test/eval boundary;
[../../policies/0024-eval-worlds-suites/POLICY.md](../../policies/0024-eval-worlds-suites/POLICY.md)
defines the world/suite separation;
[../../docs/evals-strategy/DOC.md](../../docs/evals-strategy/DOC.md)
captures longer-form strategy. This spec narrows those by fixing the
authoring contract for cases and evaluators.

## Purpose

Eval cases are declarative. A reader can open a single file and see, for one
behavior under test: what world state seeds the run, what the agent is asked
to do, and what evidence proves the run succeeded. Cases compose with reusable
fixture worlds and evaluators rather than restating setup or assertions in
prose.

## Case Format

Cases live in YAML beside their suite:

```text
evals/suites/<surface>/<suite_name>/
  cases.yaml          declarative cases for this suite
  cases.schema.json   generated JSON Schema for editor autocomplete
  eval_group.py       binds cases.yaml to a task and registered evaluators
  evaluators.py       suite-specific custom evaluators
  __init__.py
```

A case is a name, typed inputs, and a list of evaluators. The case name is
the canonical identifier; evaluator inputs read it from the case context
rather than from a separate `case_id` field.

```yaml
# yaml-language-server: $schema=cases.schema.json
name: research_tools
evaluators:
  - IsInstance: SituEvalOutput
cases:
  - name: get_project_overview_reads_board
    inputs:
      seed: with_comments
      prompt: |
        Check the project with get_project_overview, then state the objective
        and one hypothesis on the board.
    evaluators:
      - ToolCalledSuccessfully: get_project_overview
      - Contains: "Improve validation score"
      - Contains: H1
```

Inputs are typed Pydantic models declared per suite. They carry only what the
world or agent needs at runtime — typically a fixture seed, the prompt, and
optional toolset selection. Identifiers that name fixtures inside the world
appear as literal strings in YAML, not as imported Python constants.

## Evaluator Pattern

Evaluators are `@dataclass` subclasses of `pydantic_evals.Evaluator` so they
serialize to and from YAML by name. Eval groups register the custom
evaluators their suite uses through the `custom_evaluator_types` ClassVar.

Three evaluator categories cover the eval surface:

- **Built-in deterministic** — `Contains`, `IsInstance`, `EqualsExpected`
  from `pydantic_evals.evaluators` for plain-text and type checks.
- **Situ trace evaluators** — read `SituEvalOutput.captured_tool_calls`,
  `events`, and `project_overview` to assert tool sequencing, durable records,
  and emitted events. These cover the bulk of agent-behavior assertions.
- **Semantic judges** — `LLMJudge` with a rubric, used only when behavior
  cannot be expressed as a deterministic check.

Universal assertions (e.g., output type) belong at dataset level. Per-case
evaluators describe what *that* case proves.

## World Boundary

Worlds remain Python under `evals/worlds/<world_name>/`. They own SQLite
state seeding, agent invocation, tool-call capture, and teardown. A case
references a world only by passing a typed input that the suite's `task()`
method dispatches into the world.

Worlds expose seed enums (e.g., `with_baseline_result`, `with_promising_results`)
that name reusable starting states. Cases pick a seed; the world materializes
the graph. Worlds do not script the agent's choices.

## Eval Group Shape

An eval group is config plus a `task()` method. It points at its YAML cases
and lists the custom evaluators that file uses:

```python
class ResearchToolsEvalGroup(BaseSituEvalGroup[ResearchToolEvalInput, ResearchToolEvalOutput]):
    suite_name = "tools"
    cases_path = Path(__file__).parent / "cases.yaml"
    custom_evaluator_types = [
        ToolCalledSuccessfully,
        ToolArgsContain,
        ToolResultContains,
        ProjectOverviewContains,
        ProjectOverviewHasLink,
        EventWasEmitted,
    ]

    async def task(self, args: ResearchToolEvalInput) -> ResearchToolEvalOutput:
        return await run_research_tool_agent(args)
```

`BaseSituEvalGroup.dataset()` loads `cases_path` via `Dataset.from_file`,
passing `custom_evaluator_types`. The eval runner discovers groups, builds
their datasets, and calls `evaluate_sync(task)` per the standard
`pydantic_evals` flow.

## Identity And Metadata

The case name identifies the case across the runner, the report, and Logfire
attributes. Inputs do not duplicate the name. Suites do not tag cases with
markers that document a global policy — cases are subject to the eval
discipline by virtue of living under `evals/`. Per-case metadata is reserved
for case-specific facts a future reviewer would otherwise miss (e.g., a
known model-version sensitivity), not for restating defaults.

Cases that need to be temporarily disabled use
`metadata: {"@skip": "<reason>"}`; the base group filters these out before
returning the dataset.

## Suites Outside YAML

Some suites — those whose cases require runtime composition that does not
serialize cleanly (multi-phase coordination cases, cases that compute typed
inputs from world state at definition time) — keep their cases in Python.
Their `eval_group.py` overrides `eval_cases()` rather than setting
`cases_path`. The base group supports both shapes; YAML is the default for
new suites.

## Out of Scope

- Synthetic case generation via `generate_dataset`. Cases are deliberate
  behavior probes; coverage is curated, not sampled.
- A separate Situ runtime concept of "experiment" distinct from a single
  eval run. The runner names experiments from the dataset, git SHA, and a
  per-run id; that suffices for Logfire grouping.
- LLM judges as a default per-case evaluator. They are reserved for
  semantic checks deterministic evaluators cannot reasonably express.
- Eval cases that mutate the user's real workspace. Worlds use
  `TemporaryDirectory` and `~/.situ`-shaped SQLite under that tempdir.
