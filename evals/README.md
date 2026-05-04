# Almanac AI Evals

This package contains code-first evals for Almanac's agent behavior,
tool-calling flow, and observability.

Run all evals:

```bash
./commands/ai-evals.sh
```

Run one file:

```bash
./commands/ai-evals.sh evals/suites/agent_planning/micrograd_planning_eval.py
```

Run one case:

```bash
./commands/ai-evals.sh --case suspicious
```

Emit JSON:

```bash
./commands/ai-evals-json.sh
```

When `ALMANAC_LOGFIRE_TOKEN` or `LOGFIRE_TOKEN` is set, eval experiments are
sent to Logfire with `service_name=almanac-ai-evals`.

## Layout

```text
evals/
  harness/    shared runner, models, evaluators, and Logfire setup
  worlds/     fixture-backed simulated research worlds
  suites/     concrete eval groups and cases
```

The first suite uses a mocked micrograd world. It is intentionally deterministic
so prompt/tool behavior can be improved without needing a live sandbox repo.
