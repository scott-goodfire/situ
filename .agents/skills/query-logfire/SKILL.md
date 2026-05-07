---
name: query-logfire
description: Use when querying Pydantic Logfire records/traces from this repo, especially Situ harness/eval telemetry, session ids, trace ids, tool spans, errors, or model/tool execution history. Uses SITU_LOGFIRE_READ_TOKEN and avoids printing secrets.
---

# Query Logfire

## Rules

- Use `SITU_LOGFIRE_READ_TOKEN` for readback.
- Never print token values.
- Prefer compact record queries first: timestamps, service, span name, message,
  trace id, span id.
- Avoid dumping full `attributes` unless debugging a specific missing detail.
- For Situ runs, query both `situ-harness` and `situ-evals` if the origin is
  unclear.
- Report query access separately from local SQLite state evidence.

## Preflight

Check only presence:

```bash
uv run python - <<'PY'
import os
print('SITU_LOGFIRE_READ_TOKEN=' + ('present' if os.environ.get('SITU_LOGFIRE_READ_TOKEN') else 'missing'))
PY
```

Optional CLI auth check:

```bash
uv run python -m logfire --region us whoami
```

CLI auth and read-token query access are separate. A read token can work even
when repo-local CLI credentials are missing.

## Query Helper

Use `LogfireQueryClient` directly:

```bash
uv run python - <<'PY'
import os
from logfire.query_client import LogfireQueryClient

def rows_from(result):
    if isinstance(result, dict):
        return result.get('rows') or result.get('data') or []
    return result

sql = """
SELECT trace_id, span_id, start_timestamp, service_name, span_name, message
FROM records
WHERE service_name IN ('situ-harness', 'situ-evals')
  AND start_timestamp >= now() - interval '24 hours'
ORDER BY start_timestamp DESC
LIMIT 50
"""

with LogfireQueryClient(os.environ['SITU_LOGFIRE_READ_TOKEN']) as client:
    rows = rows_from(client.query_json_rows(sql))

for row in rows:
    print(row)
PY
```

## Session Review Queries

For a known session id:

```sql
SELECT trace_id, span_id, parent_span_id, start_timestamp,
       service_name, span_name, message
FROM records
WHERE service_name = 'situ-harness'
  AND start_timestamp >= now() - interval '48 hours'
  AND (
    message LIKE '%<session_id>%'
    OR attributes::text LIKE '%<session_id>%'
  )
ORDER BY start_timestamp ASC
LIMIT 200
```

For task/tool activity around a session window:

```sql
SELECT trace_id, span_id, parent_span_id, start_timestamp,
       service_name, span_name, message
FROM records
WHERE service_name = 'situ-harness'
  AND start_timestamp BETWEEN timestamp '<start_utc>' AND timestamp '<end_utc>'
  AND (
    lower(span_name) LIKE '%tool%'
    OR lower(message) LIKE '%tool%'
    OR lower(message) LIKE '%task%'
    OR lower(message) LIKE '%session%'
  )
ORDER BY start_timestamp ASC
LIMIT 300
```

For errors:

```sql
SELECT trace_id, span_id, start_timestamp, service_name, span_name, message
FROM records
WHERE service_name IN ('situ-harness', 'situ-evals')
  AND start_timestamp >= now() - interval '48 hours'
  AND (
    lower(message) LIKE '%error%'
    OR lower(message) LIKE '%exception%'
    OR lower(message) LIKE '%failed%'
  )
ORDER BY start_timestamp DESC
LIMIT 100
```

## Reporting

Include:

- Whether read-token query access worked.
- Time window queried.
- Services queried.
- Trace ids found.
- Any errors or suspicious spans.
- Whether Logfire agreed with, added to, or contradicted the local SQLite state.
