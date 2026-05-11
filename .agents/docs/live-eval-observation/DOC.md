# Live Agent Eval Observation

Live agent eval observation has three layers: local durable state, Claude
Managed Agents session state, and app-side traces. Use them in that order.

The local SQLite DB is the source of truth for Situ behavior. Managed Agents
events explain the remote agent turn. App traces should fill the gap between
our scheduler, work-item runner, custom tool handlers, and repository writes.

## Watch Mode

Run live agent evals with watch mode when you need to inspect the run while it
is still active:

```bash
SITU_ANTHROPIC_KEY=sk-ant-... mise run evals -- --watch
```

Watch mode prints a machine-readable line to stderr:

```text
LIVE_AGENT_EVAL {"type":"world.ready","rootPath":"...","workspacePath":"...","situHome":"...","dbPath":"...","sessionId":"..."}
```

Use `dbPath` for read-only SQLite queries and `workspacePath` for filesystem
inspection. Watch mode also keeps the temporary world after the eval finishes
so the run can be autopsied.

## Local SQLite

Start with the local DB. It shows what Situ has accepted as durable state:

```bash
export SITU_WATCH_DB=/tmp/situ-eval-tiny-autoresearch-.../situ/sessions/.../session.sqlite
```

Check the run, work queue, and remote event cache:

```bash
bun -e 'import { Database } from "bun:sqlite"; const db = new Database(process.env.SITU_WATCH_DB, { readonly: true }); for (const sql of ["select id,status,claude_session_id,error_message,updated_at from claude_agent_runs order by created_at desc limit 5", "select id,purpose,status,attempt,error_message,updated_at from work_items order by created_at desc limit 10", "select type,count(*) as count from claude_agent_events group by type order by type"]) console.log(sql, db.query(sql).all())'
```

Check durable output shape:

```bash
bun -e 'import { Database } from "bun:sqlite"; const db = new Database(process.env.SITU_WATCH_DB, { readonly: true }); for (const table of ["tasks","baselines","experiments","evaluations","measurements","artifacts","app_events"]) console.log(table, db.query(`select count(*) as count from ${table}`).get())'
```

Find the Managed Agents session ID from the DB:

```bash
bun -e 'import { Database } from "bun:sqlite"; const db = new Database(process.env.SITU_WATCH_DB, { readonly: true }); console.log(db.query("select claude_session_id from claude_agent_runs where claude_session_id is not null order by updated_at desc limit 1").get())'
```

## Managed Agents API

Use the Anthropic TypeScript SDK for read-only remote checks. The SDK exposes
`client.beta.sessions.retrieve`, `client.beta.sessions.events.list`, and
`client.beta.sessions.events.stream` for Managed Agents sessions.

Retrieve session status and usage:

```bash
export SITU_WATCH_CLAUDE_SESSION_ID=sesn_...
bun -e 'import Anthropic from "@anthropic-ai/sdk"; const client = new Anthropic({ apiKey: process.env.SITU_ANTHROPIC_KEY }); const session = await client.beta.sessions.retrieve(process.env.SITU_WATCH_CLAUDE_SESSION_ID); console.log(JSON.stringify({ id: session.id, status: session.status, stats: session.stats, usage: session.usage }, null, 2))'
```

List recent event types:

```bash
bun -e 'import Anthropic from "@anthropic-ai/sdk"; const client = new Anthropic({ apiKey: process.env.SITU_ANTHROPIC_KEY }); let count = 0; for await (const event of client.beta.sessions.events.list(process.env.SITU_WATCH_CLAUDE_SESSION_ID)) { console.log(event.processed_at, event.type, event.id); if (++count >= 40) break }'
```

Do not send user events, interrupts, or tool results during an eval watch unless
the user explicitly asks for an intervention. Observing should not mutate the
session.

## App Tracing

Managed Agents already emit useful remote event spans such as model request
start/end events. Situ uses OpenTelemetry for app-side spans around the local
parts the remote API cannot see:

- scheduler tick start/end and idle reason
- work item enqueue, claim, retry, completion, and failure
- Claude run start/end and session replacement
- custom tool start/end with tool name, run ID, work item ID, and record IDs
- repository writes that create durable research records

Set `SITU_OTEL_EXPORTER_OTLP_ENDPOINT` when a trace viewer is available. When
the endpoint is absent, app tracing is off. Logs are emitted through
LogLayer/Pino and include active trace context when a span is present.

## Failure Reading

Use both local and remote evidence before changing timeouts:

- `work_items` pending with no `claude_agent_runs` means scheduler/enqueue
  stalled.
- `claude_agent_runs` running with no remote session ID means resource
  provisioning stalled.
- Remote session running with no new local `claude_agent_events` means event
  stream handling stalled.
- Remote `agent.custom_tool_use` with a local run stuck waiting means custom
  tool handling or tool-result send failed.
- Durable domain rows missing after a complete run means the agent answered in
  prose without using the Situ tools.

## References

- Anthropic Managed Agents session docs:
  `https://platform.claude.com/docs/en/managed-agents/sessions`
- Anthropic Managed Agents event stream docs:
  `https://platform.claude.com/docs/en/managed-agents/events-and-streaming`
- Anthropic TypeScript SDK Managed Agents session/event types:
  `node_modules/@anthropic-ai/sdk/resources/beta/sessions/`
