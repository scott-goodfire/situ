---
name: run-and-verify-evals
description: Use when running Situ eval suites, checking eval pass/fail output, or verifying that eval runs reached Logfire through the UI or a Logfire read token.
---

# Run And Verify Evals

## Overview

Use this skill for Situ eval execution and verification. Evals make real LLM
calls and should be treated separately from deterministic pytest checks.

Logfire is the preferred way to observe realistic evals while they are
running. Use local output for the final pass/fail summary, but watch Logfire
live for tool calls, traces, errors, and whether the agent is making progress.

Do not print secrets. If you need to inspect env, check only whether required
variables are present.

## Preflight

1. Check the worktree:

```bash
git status --short
```

2. List eval groups before running a new suite:

```bash
./commands/evals.sh --list evals/suites
./commands/evals.sh --list evals/suites/tools/research_tools/eval_group.py
```

3. Required execution credentials:

- `SITU_OPENAI_KEY` for model calls.
- `SITU_LOGFIRE_TOKEN` for sending eval traces to Logfire.

Eval discovery and `--list` should work without credentials. Executing cases
should fail clearly if credentials are missing.

## Run Strategy

Realistic evals can take a while because they make live model calls and may run
multiple agent passes. During iteration, run the smallest targeted eval that
can answer the question:

- One case with `--case` when debugging behavior.
- One eval group with `--concurrency 1` when stabilizing a suite.
- Deterministic pytest/syntax checks before rerunning expensive live evals.

Use broader, parallel eval runs for regression verification after the targeted
case is stable. Parallel runs are useful when looking for regressions across a
suite, but they interleave traces and are noisier for first-pass debugging.

## Commands

Run all evals:

```bash
./commands/evals.sh --concurrency 1
```

Run the research-tool affordance evals:

```bash
./commands/evals.sh evals/suites/tools/research_tools/eval_group.py --concurrency 1
```

Run the full ResearchAgent session evals:

```bash
./commands/evals.sh evals/suites/agents/research_agent/research_session/eval_group.py --concurrency 1
```

Run the ResearchAgent repo-bootstrap evals:

```bash
./commands/evals.sh evals/suites/agents/research_agent/repo_bootstrap/eval_group.py --concurrency 1
```

Run one case:

```bash
./commands/evals.sh evals/suites/tools/research_tools/eval_group.py --case get_project_board_reads_board --concurrency 1
```

Run a full group in parallel after the targeted checks are stable:

```bash
./commands/evals.sh evals/suites/agents/multi_agent_loop/eval_group.py --concurrency 4
```

If a turn is interrupted, check for leftover eval runners before starting a new
run so duplicate live model calls do not continue in the background.

```bash
ps -eo pid,ppid,pgid,stat,etime,command | rg 'commands/evals.sh|evals.runner|eval_group.py' | rg -v rg
```

## Live Logfire Observation

Use Logfire during long evals instead of waiting blind for local output. This
is especially useful for multi-agent loops where the local runner may stay
quiet until the case finishes.

For detailed auth, token, and query workflows, use:

```text
.agents/skills/use-logfire/SKILL.md
```

Good live checks:

- Recent `running tool` spans to see what the agent is doing now.
- Recent `evaluate {name}` spans to identify the experiment/run.
- Recent error/exception/failed messages across `situ-evals` and
  `situ-harness`.
- Root eval span metadata for case count, averages, and experiment identity.

Prefer compact queries while watching live. Avoid dumping full prompt or
attribute payloads unless debugging a specific failure.

## Local Verification

Record these in the final response:

- Eval command run.
- Experiment name printed by the runner, for example
  `tools.research-tools-<git-sha>-<session-id>`.
- Number of cases.
- Whether all assertions passed.
- Any failed case names and first failure reason.

The local pass/fail summary is necessary but not sufficient when the user asks
to verify Logfire.

## Logfire Verification

Post-run Logfire verification is still required when the user asks whether a
run reached Logfire. For detailed auth, token, and query workflows, use:

```text
.agents/skills/use-logfire/SKILL.md
```

Preferred UI path:

1. Open Logfire in the US region.
2. Confirm you are logged in.
3. Open **Evals: Datasets & Experiments**.
4. Find the local dataset matching the runner's dataset name, such as
   `tools.research-tools` or `agents.research-agent-repo-bootstrap`.
5. Confirm the experiment name printed by the runner exists.
6. Open the experiment and confirm case rows, assertions, and trace links are
   present.

Programmatic path requires a read token. A write token such as
`SITU_LOGFIRE_TOKEN` is for ingestion and may not be accepted by the query
client. If a read token is available, keep it separate, for example:

```bash
export SITU_LOGFIRE_READ_TOKEN=...
```

Then query recent records:

```bash
uv run python - <<'PY'
import os
from datetime import datetime, timedelta, timezone

from logfire.query_client import LogfireQueryClient

experiment = "tools.research-tools-<git-sha>-<session-id>"
token = os.environ["SITU_LOGFIRE_READ_TOKEN"]

sql = f"""
SELECT trace_id, span_id, start_timestamp, service_name, message
FROM records
WHERE service_name = 'situ-evals'
  AND start_timestamp >= now() - interval '2 hours'
  AND message LIKE '%{experiment}%'
ORDER BY start_timestamp DESC
LIMIT 20
"""

with LogfireQueryClient(token) as client:
    rows = client.query_json_rows(sql)

print(rows)
PY
```

If this query returns no rows, broaden the search:

```sql
SELECT trace_id, span_id, start_timestamp, service_name, message
FROM records
WHERE service_name = 'situ-evals'
  AND start_timestamp >= now() - interval '2 hours'
ORDER BY start_timestamp DESC
LIMIT 20
```

## Reporting

Be precise:

- If local evals pass and Logfire readback succeeds, say both.
- If local evals pass but Logfire readback is blocked by missing browser auth or
  missing read token, say that clearly and include the attempted verification.
- Do not call Logfire verified unless the UI or query API actually showed the
  run.
