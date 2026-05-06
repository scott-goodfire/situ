---
name: review-situ-run
description: Use when reviewing or autopsying a completed or active Situ autoresearch run/session from a TUI screenshot, workspace path, session id, local .situ state, or Logfire traces. Covers locating the SQLite ledger, reconstructing tasks/experiments/evaluations/events, inspecting the actual workspace code the agent saw, checking diffs, using Logfire when available, and judging run quality.
---

# Review Situ Run

## Goal

Reconstruct what happened in a Situ run from durable local evidence, then
answer whether the agent loop did good work and what should improve next.

Prefer the Situ ledger over screenshots. A screenshot is a pointer to the
workspace path, session id, counts, and last event time; the ledger is the
source of truth.

## Inputs To Ask For Or Infer

- Workspace/run path, for example
  `/Users/.../runs/spell-autoresearch`.
- Session id, for example `session_0004`.
- Optional project id if known.
- Optional validation command, such as `python harness.py`.
- Optional local state home if not `~/.situ`.
- Optional Logfire org/project, trace id, or time window.

If the user provides a TUI screenshot, extract the workspace path and session
id from it before asking follow-up questions.

## Locate The Ledger

Situ stores per-workspace state under `~/.situ/projects/<workspace_id>/`.
`workspace_id` is the first 16 hex characters of the SHA256 hash of the
resolved workspace path.

```bash
uv run python - <<'PY'
import hashlib
from pathlib import Path

path = Path("/path/to/workspace").resolve()
print(path)
print(hashlib.sha256(str(path).encode()).hexdigest()[:16])
PY
```

Then check:

```bash
ls -la ~/.situ/projects/<workspace_id>
sqlite3 ~/.situ/projects/<workspace_id>/situ.sqlite '.tables'
```

If the DB is intermittently locked by a live TUI or harness, use
`sqlite3 -cmd '.timeout 5000' ...` and retry read-only queries.

## Findings Scratchpad

Create a temporary findings file before the deep review, then update it as you
walk each stage. This keeps the audit coherent when the run has many tasks,
activities, traces, and workspace diffs.

```bash
mkdir -p /tmp/situ-run-review-findings
```

Use a predictable path such as:

```text
/tmp/situ-run-review-findings/<workspace-name>-<session-id>.md
```

Record short notes under headings like:

- `Run Summary`
- `Stage Walkthrough`
- `Model Quality`
- `Workspace Evidence`
- `Logfire Evidence`
- `Judgement`
- `System Improvements`

Do not put secrets in the scratchpad. It is fine to include local paths,
session ids, task ids, trace ids, metrics, and concise snippets from ledger
activities.

## Core Queries

Use `sqlite3 -header -column` unless a script is clearer.

```sql
select id, workspace_id, project_id, status, created_at, updated_at
from sessions
order by id;

select type, substr(message,1,220) as message, created_at
from events
where associated_session_id = '<session_id>'
order by id;

select id, kind, status, priority, title, assignee_id,
       substr(result_summary,1,220) as result, created_at, completed_at
from tasks
where created_in_session_id = '<session_id>'
   or claimed_in_session_id = '<session_id>'
   or completed_in_session_id = '<session_id>'
order by created_at;

select id, status, title, substr(summary,1,260) as summary, created_at, updated_at
from hypotheses
where created_in_session_id = '<session_id>'
order by created_at;

select id, status, title, substr(summary,1,260) as summary, created_at, updated_at
from experiments
where created_in_session_id = '<session_id>'
order by created_at;

select id, status, title, associated_experiment_id,
       substr(summary,1,260) as summary, created_at, updated_at
from evaluations
where created_in_session_id = '<session_id>'
order by created_at;
```

For evidence detail, inspect activities:

```sql
select e.title, a.kind, substr(a.body,1,800) as body, a.created_at
from evaluation_activities a
join evaluations e on e.id = a.evaluation_id
where e.created_in_session_id = '<session_id>'
order by a.created_at;

select x.title, a.kind, substr(a.body,1,800) as body, a.created_at
from experiment_activities a
join experiments x on x.id = a.experiment_id
where x.created_in_session_id = '<session_id>'
order by a.created_at;
```

For a stage-by-stage walkthrough, inspect tasks together with their linked
entities:

```sql
select t.id, t.kind, t.status, t.priority, t.title, t.assignee_id,
       substr(t.content,1,260) as content,
       substr(t.result_summary,1,260) as result,
       t.created_at, t.claimed_at, t.completed_at,
       group_concat(l.entity_kind || ':' || l.entity_id, ', ') as links
from tasks t
left join task_entity_links l on l.task_id = t.id
where t.project_id = '<project_id>'
group by t.id
order by t.created_at;

select task_id, kind, substr(body,1,800) as body, payload_json, created_at
from task_activities
where project_id = '<project_id>'
order by id;

select task_id, entity_kind, entity_id, relationship, created_at
from task_entity_links
where project_id = '<project_id>'
order by task_id, entity_kind, entity_id;
```

Then inspect each entity family and its activities:

```sql
select id, status, title, substr(summary,1,320) as summary,
       substr(content,1,500) as content, created_at, updated_at
from analyses
where project_id = '<project_id>'
order by created_at;

select a.analysis_id, a.kind, substr(a.body,1,800) as body, a.created_at
from analysis_activities a
join analyses n on n.id = a.analysis_id
where n.project_id = '<project_id>'
order by a.created_at;

select h.id, h.status, h.title, substr(h.summary,1,320) as summary,
       h.created_at, h.updated_at
from hypotheses h
where h.project_id = '<project_id>'
order by h.created_at;

select h.title, a.kind, substr(a.body,1,800) as body, a.created_at
from hypothesis_activities a
join hypotheses h on h.id = a.hypothesis_id
where h.project_id = '<project_id>'
order by a.created_at;

select x.id, x.status, x.title, substr(x.summary,1,320) as summary,
       x.created_at, x.updated_at
from experiments x
where x.project_id = '<project_id>'
order by x.created_at;

select x.title, a.kind, substr(a.body,1,800) as body, a.created_at
from experiment_activities a
join experiments x on x.id = a.experiment_id
where x.project_id = '<project_id>'
order by a.created_at;

select e.id, e.status, e.title, e.associated_experiment_id,
       substr(e.summary,1,320) as summary, e.created_at, e.updated_at
from evaluations e
where e.project_id = '<project_id>'
order by e.created_at;

select e.title, a.kind, substr(a.body,1,1000) as body, a.created_at
from evaluation_activities a
join evaluations e on e.id = a.evaluation_id
where e.project_id = '<project_id>'
order by a.created_at;
```

## Code And Workspace Check

Inspect the actual code and files the agent saw. Use the project objective,
research context, tasks, and evaluation activities to identify allowed and
forbidden surfaces before deciding what to open.

Common checks:

```bash
git -C /path/to/workspace status --short
git -C /path/to/workspace diff --stat
git -C /path/to/workspace diff
git -C /path/to/workspace rev-parse --abbrev-ref HEAD
git -C /path/to/workspace rev-parse HEAD
```

Read the key source/eval files directly, usually including the harness,
project instructions, editable target files, and any files the ledger says were
read. For a dirty workspace, compare final files against the recorded baseline
commit when available:

```bash
sed -n '1,220p' /path/to/workspace/harness.py
sed -n '1,220p' /path/to/workspace/program.md
sed -n '1,260p' /path/to/workspace/spell.py
git -C /path/to/workspace show <baseline_commit>:runs/<run-name>/spell.py
```

Do not inspect held-out or forbidden files as part of judging the agent's
research reasoning unless the review question is specifically about leakage or
integrity. It is usually enough to verify they were unchanged.

Only rerun the project validation command when it is local and appropriate for
the run. If the command is expensive, destructive, or unclear, report that
instead of running it.

## Logfire Check

Use Logfire when available, especially for active or ambiguous runs. The local
SQLite ledger tells what was recorded; Logfire can show model/tool spans,
errors, retries, missing tool calls, or why a long run appeared stuck.

Follow `.agents/skills/query-logfire/SKILL.md` for record queries and
`.agents/skills/use-logfire/SKILL.md` for auth/project setup. Never print
tokens.

Minimum checks:

```bash
uv run python -m logfire --region us whoami
uv run python -m logfire --region us projects list
```

If `SITU_LOGFIRE_READ_TOKEN` is present, query compact recent harness records:

```sql
SELECT trace_id, span_id, start_timestamp, service_name, span_name, message
FROM records
WHERE service_name = 'situ-harness'
  AND start_timestamp >= now() - interval '24 hours'
ORDER BY start_timestamp DESC
LIMIT 50
```

For a known session id:

```sql
SELECT trace_id, span_id, start_timestamp, service_name, span_name, message
FROM records
WHERE service_name = 'situ-harness'
  AND start_timestamp >= now() - interval '24 hours'
  AND (
    message LIKE '%<session_id>%'
    OR attributes::text LIKE '%<session_id>%'
  )
ORDER BY start_timestamp ASC
LIMIT 100
```

If query access is unavailable, say so and rely on the ledger plus workspace
evidence.

## Review Rubric

Judge the run on evidence, not vibes:

- Objective: Did final reported metrics improve the optimization target while
  respecting constraints?
- Integrity: Did the agent avoid forbidden files and held-out optimization?
- Process: Did it establish a baseline before candidate edits?
- Causality: Are hypotheses, experiments, evaluations, and activities linked so
  improvements can be traced to specific changes?
- Search quality: Did it run bounded, interpretable experiments instead of
  broad or unexplained edits?
- Stopping quality: Did it stop for a defensible reason, or did loop control
  end the run prematurely?
- Observability: Could a human reconstruct the run from tasks, activities,
  events, artifacts, and workspace diff?
- Reproducibility: Can the final metric be rerun and does it match the ledger
  closely enough?

## Stage Walkthrough

Walk the run in task order. For each meaningful task or group of plan tasks:

- Read the task model: kind, status, title, content, payload, assignee,
  timestamps, result summary.
- Read task activities and task entity links.
- Read linked analyses, hypotheses, experiments, evaluations, artifacts, and
  their activities.
- Inspect the workspace files or diffs that the stage depended on.
- Check Logfire spans for missing tool calls, retries, errors, or suspicious
  gaps when available.
- Judge that stage for intent clarity, evidence quality, linkage quality,
  constraint integrity, and whether the next task followed from the evidence.

The stage judgement should distinguish agent quality from product/system
quality. Example: "The Scientist made a good bounded experiment, but the
Manager loop closed the project too early" is more useful than a single pass or
fail label.

Also judge the models as models:

- Tasks: Were they useful coordination work orders, or noisy/redundant?
- Activities: Did they preserve the reasoning/result that matters, or just
  repeat status transitions?
- Analyses: Did they capture reusable understanding before hypotheses?
- Hypotheses: Were they testable and linked to evidence?
- Experiments: Were they bounded, comparable, and linked to hypotheses?
- Evaluations: Were metrics reproducible, constraint-aware, and not optimized
  against held-out data?
- Artifacts: Were diffs, logs, or result files preserved when they would help
  future review?

Call out both product behavior and agent behavior. For example, a run can have
good research output but weak loop ergonomics if the Manager closes the project
and then the runtime still burns extra planning passes.

## Reporting Shape

Keep the answer concrete:

- State where the ledger was found.
- Give the session time range and counts.
- Summarize task flow in order.
- List baseline and candidate metrics.
- List files changed and whether forbidden surfaces changed.
- Note whether key source/eval files were inspected.
- Note whether Logfire was checked or why it was unavailable.
- State whether the agent did a good job, with evidence.
- End with system improvements that would make the next run better.
