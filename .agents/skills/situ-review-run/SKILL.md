---
name: situ-review-run
description: Use when reviewing or autopsying a Situ session/run from local state, a session id, workspace path, UI output, SQLite state, or Claude agent events.
---

# Situ Review Run

## Goal

Reconstruct what happened in a local Situ run from durable state, then explain
the session outcome, failures, stuck work, and useful next actions.

Prefer SQLite and registry evidence over screenshots. Screenshots are pointers
to a session id, workspace path, or last visible event.

## State Layout

This app stores state per session:

```text
~/.situ/registry.json
~/.situ/secrets.json
~/.situ/sessions/<session-id>/metadata.json
~/.situ/sessions/<session-id>/session.sqlite
```

`SITU_HOME` can override `~/.situ`. `SITU_DB_PATH` can override the SQLite path
for advanced/debug runs.

## Locate The Session

Start from the repo root:

```bash
cat ~/.situ/registry.json
find ~/.situ/sessions -maxdepth 2 -name metadata.json -print
```

For a known session:

```bash
sqlite3 ~/.situ/sessions/<session-id>/session.sqlite '.tables'
sqlite3 ~/.situ/sessions/<session-id>/session.sqlite 'select id,title,status,repo_path,created_at,updated_at from session;'
```

If the app is live, avoid writes and use read-only queries. If SQLite is busy,
retry with:

```bash
sqlite3 -cmd '.timeout 5000' <db-path> '<query>'
```

## Evidence Queries

Use these as a first pass:

```bash
sqlite3 <db> "select id,type,title,status,priority,created_at,updated_at,result_summary from research_tasks order by created_at;"
sqlite3 <db> "select id,purpose,target_kind,target_id,status,attempt,created_at,updated_at,payload_json from work_items order by created_at;"
sqlite3 <db> "select id,agent_id,work_item_id,status,attempt,error_message,created_at,updated_at from claude_agent_runs order by created_at;"
sqlite3 <db> "select id,kind,display_name,status,model,claude_session_id from claude_agents order by created_at;"
sqlite3 <db> "select id,role,status,substr(content,1,240),created_at from messages order by created_at;"
sqlite3 <db> "select id,agent_id,type,substr(payload_json,1,500),created_at from claude_agent_events order by created_at;"
```

Research records:

```bash
sqlite3 <db> "select id,title,status,summary,created_at,updated_at from hypotheses order by created_at;"
sqlite3 <db> "select id,title,status,summary,created_at,updated_at from baselines order by created_at;"
sqlite3 <db> "select id,title,status,summary,created_at,updated_at from experiments order by created_at;"
sqlite3 <db> "select id,title,status,summary,created_at,updated_at from evaluations order by created_at;"
sqlite3 <db> "select id,type,message,substr(payload_json,1,400),created_at from app_events order by created_at;"
```

## Review Checklist

- Did the session create or resume the intended workspace?
- Was an Anthropic key available? Check status output, not secret values.
- Which ResearchTasks were created, claimed, completed, failed, or left active?
- Which work items are pending or claimed after the run?
- Did Claude agent runs fail because of API/session/tool errors?
- Did custom tools create durable records and activities?
- Did the UI sync state through `sync_version` updates?

## Reporting

Lead with concrete findings: stuck ResearchTasks, failed runs, missing key,
missing tool handler, terminated Claude session, or no useful records. Include the
session id, database path, and the exact queries or commands used.
