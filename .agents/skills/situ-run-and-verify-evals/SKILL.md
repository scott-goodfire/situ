---
name: situ-run-and-verify-evals
description: Use when running, watching, or verifying Situ live agent evals.
---

# Situ Run And Verify Evals

## Current Evals

This repo keeps non-LLM prompt/runtime/world tests next to the live eval
fixtures:

```text
projects/evals/evalite.config.ts
projects/evals/src/prompts.eval.ts
projects/evals/src/runtime-skills.eval.ts
projects/evals/src/scorers/
projects/evals/src/worlds/__shared__/
projects/evals/src/worlds/tiny-autoresearch/state.eval.ts
projects/evals/src/worlds/tiny-autoresearch/live-agent-eval.ts
projects/evals/packages/fixtures/
projects/evals/packages/worlds/
```

Non-LLM prompt, runtime-skill, fixture, and seeded-world checks are tests. Live
agent evals intentionally hit Claude Managed Agents and require
`SITU_ANTHROPIC_KEY`.

## Run Live Agent Evals

Run live agent evals only when the user wants real Claude verification:

```bash
SITU_ANTHROPIC_KEY=sk-ant-... mise run evals
```

If the key is configured in shell startup, run from a zsh shell that sources it:

```bash
source ~/.zshrc >/dev/null 2>&1
mise run evals
```

Never print the key. Missing credentials should fail clearly.

## Watch A Live Agent Eval

Use watch mode when the user wants an agent to observe a live agent eval as it
runs:

```bash
SITU_ANTHROPIC_KEY=sk-ant-... mise run evals -- --watch
```

Watch mode prints a `LIVE_AGENT_EVAL {"type":"world.ready",...}` line to
stderr. Copy the `dbPath` into `SITU_WATCH_DB` and inspect the local SQLite DB
read-only while the eval process continues:

```bash
export SITU_WATCH_DB=/tmp/.../session.sqlite
bun -e 'import { Database } from "bun:sqlite"; const db = new Database(process.env.SITU_WATCH_DB, { readonly: true }); console.log(db.query("select id,status,claude_session_id,error_message from claude_agent_runs order by created_at desc limit 5").all())'
```

Find the Managed Agents session ID from `claude_agent_runs`, then use the
Anthropic SDK for read-only remote status/event checks:

```bash
export SITU_WATCH_CLAUDE_SESSION_ID=sesn_...
bun -e 'import Anthropic from "@anthropic-ai/sdk"; const client = new Anthropic({ apiKey: process.env.SITU_ANTHROPIC_KEY }); const session = await client.beta.sessions.retrieve(process.env.SITU_WATCH_CLAUDE_SESSION_ID); console.log(JSON.stringify({ status: session.status, stats: session.stats, usage: session.usage }, null, 2))'
```

For the fuller watch workflow, read:

```bash
sed -n '1,260p' .agents/docs/live-eval-observation/DOC.md
```

When deeper timing correlation is needed, enable standard tracing instead of
adding one-off prints:

```bash
SITU_OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces mise run evals -- --watch
```

Do not send events, interrupts, or custom-tool results to the remote session
while observing unless the user explicitly asks for an intervention.

## Add A Live Agent Eval

Use a live agent eval only when the behavior depends on model/tool choice. Keep
it small and explicit:

- isolated `SITU_HOME`
- clear Anthropic key requirement
- staged fixture world
- one focused Manager, Scientist, Verifier, scheduler, work-item, or CLI slice
- 2-3 minute target runtime
- assertions on durable records, not only final prose

Live agent evals should fail clearly when credentials are missing and should
not read saved runtime secrets unless the eval explicitly documents that choice.

## Verify

Before reporting live agent eval success, run:

```bash
SITU_ANTHROPIC_KEY=sk-ant-... mise run evals
```

If the change touches TypeScript compile paths, also run:

```bash
mise run check
```

If `mise run check` is blocked by unrelated in-flight work, report the exact
blocking files and keep the live eval result separate.

If the user says not to run evals, do not run `mise run evals`. Report that
live agent eval execution was intentionally skipped and list any tests you did
run.
