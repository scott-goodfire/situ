# Almanac Evals

This package contains code-first evals for Almanac's agent behavior,
tool-calling flow, and observability.

Evals make real model calls. They require `ALMANAC_OPENAI_KEY`; unit tests
should cover deterministic behavior, while evals cover live model behavior
against controlled fixture worlds.

Run all evals:

```bash
./commands/evals.sh
```

Run one file:

```bash
./commands/evals.sh evals/suites/agent_planning/research_session/eval_group.py
```

Run the basic research-tool evals:

```bash
./commands/evals.sh evals/suites/tool_use/research_tools/eval_group.py
```

Run one case:

```bash
./commands/evals.sh --case suspicious
```

Retry transient task or evaluator failures:

```bash
./commands/evals.sh --task-retries 2 --evaluator-retries 1
```

Emit JSON:

```bash
./commands/evals-json.sh
```

Eval experiments are sent to Logfire by default with
`service_name=almanac-evals`. Set `ALMANAC_LOGFIRE_TOKEN` in the environment
used to launch evals.

## Layout

```text
evals/
  harness/
    capture/tool_call_capture/capability.py
    eval_groups/base_almanac_eval_group/eval_group.py
    evaluators/tool_was_called/evaluator.py
    judges/standard_almanac_judge/judge.py
    logfire/configure_eval_observability/configure.py
    models/almanac_eval_output/model.py
  runner/
    cli.py
    discovery.py
    execution.py
  worlds/
    research_session/
      agents/research_agent/agent.py
      agents/tool_agent/agent.py
      world/world.py
  suites/
    agent_planning/
      research_session/
        cases.py
        eval_group.py
    tool_use/
      research_tools/
        cases.py
        eval_group.py
```

The `agent-planning.research-session` suite runs the real Almanac
`ResearchAgent` with the real research toolset against temporary SQLite session
worlds. The first cases are happy-path checks for inspecting a session, creating
hypotheses, creating follow-up experiments, linking them, and leaving durable
comments.

The `tool-use.research-session` suite uses the actual Almanac research toolset
against temporary SQLite session worlds. Each case asks the model to exercise
one tool and then checks captured tool calls plus durable session state.
