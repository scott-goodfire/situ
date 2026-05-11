---
name: situ-review-flow
description: "Use when explaining, auditing, or debugging Situ's local runtime flow: CLI, Hono server, scheduler, work items, Claude Managed Agent sessions, ResearchTasks, custom tools, and Replicache sync."
---

# Situ Review Flow

## Goal

Explain how the current app works from local evidence. Do not answer from
memory. Read the code that defines the flow and cite concrete files.

## Evidence Pass

Start with:

```bash
sed -n '1,180p' README.md
sed -n '1,220p' projects/app/src/cli.ts
sed -n '1,220p' projects/app/src/server.ts
sed -n '1,320p' projects/app/src/config/session-context.ts
sed -n '1,260p' projects/app/src/runtime/scheduler/jobs.ts
sed -n '1,260p' projects/app/src/runtime/work-items/handlers.ts
sed -n '1,360p' projects/app/src/claude/agents/runs/execute-turn.ts
sed -n '1,340p' projects/app/src/runtime/dispatch/research-projects.ts
sed -n '1,260p' projects/app/src/routes/replicache.ts
sed -n '1,200p' projects/web/src/main.tsx
sed -n '1,260p' projects/web/src/app/app-shell/app-shell.tsx
```

Useful searches:

```bash
rg -n "ensureRuntimeContext|createRuntimeScheduler|claimDueWorkItem|enqueueClaudeAgent|custom_tool|syncVersion|notifySyncChanged" projects/app/src
rg -n "CLAUDE_.*WORK_ITEM_PURPOSE|roleForWorkItem|enqueueScientistResearchTaskWork" projects/app/src
rg -n "Replicache|EventSource|bootstrap|status" projects/app/src/web projects/app/src/http
```

## Current Mental Model

Trace these stages:

1. CLI parses command and runtime flags.
2. Runtime context selects or creates a session id and per-session SQLite DB.
3. Hono serves API routes and web assets.
4. Scheduler periodically dispatches work items, ResearchTask routing, lease
   recovery, and Claude session reconciliation.
5. User chat or automation enqueues Claude agent work.
6. Claude Managed Agent sessions stream events.
7. Custom tool use is resolved through the Situ tool registry.
8. SQLite rows get `syncVersion` updates.
9. Replicache pull and SSE poke update the browser state.

## What To Check

- Is this a chat flow, ResearchTask automation flow, or release/runtime flow?
- Which tables are source of truth for the behavior?
- Which work item purpose routes to which role?
- Does the flow require an Anthropic key?
- Does the UI read directly from APIs or from Replicache state?
- Are failures persisted in `claude_agent_runs`, `messages`, or `app_events`?

## Reporting

Give a short walkthrough plus the most relevant file references. If the user is
debugging a failure, lead with the failure point and the state table to inspect.
