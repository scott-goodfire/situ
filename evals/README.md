# Almanac AI Evals

This package contains code-first evals for Almanac's agent behavior,
tool-calling flow, and observability.

AI evals make real model calls. They require `ALMANAC_OPENAI_KEY` or
`OPENAI_API_KEY`. Unit tests should cover deterministic behavior; evals are for
live model behavior against controlled fixture worlds.

Run all evals:

```bash
./commands/ai-evals.sh
```

Run one file:

```bash
./commands/ai-evals.sh evals/suites/agent_planning/micrograd/eval_group.py
```

Run one case:

```bash
./commands/ai-evals.sh --case suspicious
```

Retry transient task or evaluator failures:

```bash
./commands/ai-evals.sh --task-retries 2 --evaluator-retries 1
```

Emit JSON:

```bash
./commands/ai-evals-json.sh
```

Eval experiments are sent to Logfire by default with
`service_name=almanac-ai-evals`. Set `ALMANAC_LOGFIRE_TOKEN` in the environment
used to launch evals.

Set `ALMANAC_LOGFIRE_EVALS_BASE_URL` to print direct experiment links in the
terminal and JSON output.

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
    micrograd/
      fixtures/results.py
      models/input/model.py
      scenarios/suspicious_win/scenario.py
      world/world.py
  suites/
    agent_planning/
      micrograd/
        cases.py
        eval_group.py
```

The first suite uses a mocked micrograd world. It is intentionally deterministic
so prompt/tool behavior can be improved without needing a live sandbox repo.
