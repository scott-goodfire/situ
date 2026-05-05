---
name: use-logfire
description: "Use when working with Pydantic Logfire from this repo: checking CLI auth, telling the user how to log in, selecting projects, creating read tokens, querying traces, or verifying Situ eval and harness telemetry."
---

# Use Logfire

## Overview

Use this skill for Logfire auth, project selection, read-token creation, trace
queries, and UI verification.

Never print token values. Check only whether secrets are present, and use temp
files or in-memory variables for short-lived read tokens.

## Check Login

Run from the repo root:

```bash
uv run python -m logfire --region us whoami
```

If this fails with "Not logged in" or missing `.logfire` credentials, tell the
user to run:

```bash
cd ~/autoresearch-harness
uv run python -m logfire --region us auth
```

They should complete the browser login, then verify:

```bash
uv run python -m logfire --region us whoami
```

Do not try to complete browser auth for the user unless they explicitly ask and
the browser session is available.

## Select Project

List projects:

```bash
uv run python -m logfire --region us projects list
```

Use the intended project:

```bash
uv run python -m logfire --region us projects use --org <org> <project>
```

This repo may have a previously selected Situ Logfire project; verify the
active project before assuming it.

## Token Types

There are two common token roles:

- Write/ingestion token: used by the SDK to send spans. In this repo this is
  usually `SITU_LOGFIRE_TOKEN`.
- Read token: used by `LogfireQueryClient` or the query API to read records.
  Prefer `SITU_LOGFIRE_READ_TOKEN` when available.

A write token may not work for query/readback. If readback is needed and no read
token is available, create one:

```bash
uv run python -m logfire --region us read-tokens --project <org>/<project> create
```

Do not print the token in final answers. If creating a token inside a command,
write it to a temp file and remove it before the command exits.

## Query Recent Records

Use the `records` table for trace/log readback. Useful columns:

- `trace_id`
- `span_id`
- `parent_span_id`
- `start_timestamp`
- `service_name`
- `span_name`
- `message`
- `attributes`

Basic query with an existing read token:

```bash
uv run python - <<'PY'
import os

from logfire.query_client import LogfireQueryClient

token = os.environ["SITU_LOGFIRE_READ_TOKEN"]

sql = """
SELECT trace_id, span_id, start_timestamp, service_name, message
FROM records
WHERE service_name = 'situ-evals'
  AND start_timestamp >= now() - interval '24 hours'
ORDER BY start_timestamp DESC
LIMIT 20
"""

with LogfireQueryClient(token) as client:
    print(client.info())
    print(client.query_json_rows(sql))
PY
```

Short-lived read-token flow:

```bash
tmp=$(mktemp /tmp/situ-logfire-read-token.XXXXXX)
trap 'rm -f "$tmp"' EXIT
uv run python -m logfire --region us read-tokens --project <org>/<project> create > "$tmp"
uv run python - "$tmp" <<'PY'
import re
import sys
from pathlib import Path

from logfire.query_client import LogfireQueryClient

text = Path(sys.argv[1]).read_text()
match = re.search(r'(pylf[a-zA-Z0-9_\-]+)', text)
if match is None:
    raise SystemExit("Could not parse read token from CLI output")

with LogfireQueryClient(match.group(1)) as client:
    print(client.info())
PY
```

## Verify Eval Runs

For evals, query recent `situ-evals` records and inspect the root evaluation
span:

```sql
SELECT trace_id, span_id, start_timestamp, service_name, span_name, message, attributes
FROM records
WHERE service_name = 'situ-evals'
  AND start_timestamp >= now() - interval '24 hours'
ORDER BY start_timestamp DESC
LIMIT 50
```

Root eval spans usually have:

- `span_name` like `evaluate {name}`
- `attributes->>'n_cases'`
- `attributes->>'metadata'`
- `attributes->>'logfire.experiment.metadata'`

Situ currently disables Logfire SDK scrubbing for demo/debug visibility.
Confirm both harness and eval `logfire.configure(...)` calls pass
`scrubbing=False` before assuming Logfire will preserve full attributes. Do not
send real user secrets, production credentials, or sensitive payloads while this
demo posture is active.

## UI Verification

If query access is unavailable, use the UI:

1. Open Logfire in the US region.
2. Confirm the user is logged in.
3. Open the `situ` project.
4. Use **Evals: Datasets & Experiments** for eval runs.
5. Use **Live** or **Explore** for traces and SQL.
6. Confirm the dataset/run or trace is visible before calling it verified.

## Reporting

When reporting Logfire work:

- Say whether CLI auth worked.
- Say which org/project was queried.
- Include trace IDs and non-secret metadata.
- Say whether verification was via query API or UI.
- Be explicit when readback is blocked by missing auth or missing read token.
