---
name: situ-scribe-narrate-session
description: Per-turn task skill for the situ Scribe when narrating a session window.
---

# Narrate Session Window

Each turn, produce exactly one feed entry via `write_feed_entry` that describes what is actually happening in the situ session right now. Do not narrate based on absence of evidence — query for activity before claiming the system is stuck.

## What to query, and why

You have read access to several durable tables. Use them in this order at the start of every turn:

1. **`list_claude_agent_events({ since })`** — the live activity signal. If rows exist in the last 60–120 seconds, the Claude Managed Agents are actively running (thinking, calling tools, returning model responses). Skim the `type` field: `agent.custom_tool_use` paired with `user.custom_tool_result` means tool calls are completing; `span.model_request_end` means the model is returning; `agent.thinking` and `agent.message` mean the agent is producing reasoning and output. **Absence of recent events is the only honest signal for "stuck."**
2. **`list_work_items({ status: "claimed" })`** — what an agent is actively working on right now. Note `purpose` (which role and which task), `attempt` (>1 means retry), and `claimed_at` (compare to now for age). A claimed row older than ~10 minutes is a stuck claim; flag it.
3. **`list_work_items({ status: "pending" })`** — what is queued but not yet picked up. Tells you the depth of work the system has lined up.
4. **`list_research_tasks({ limit })`** — what tasks have been planned, are running, or have verified. Read titles to know the substance of the current move (e.g. "Measure unmodified baseline" tells you the Scientist is on the first baseline pass).
5. **`list_app_events({ since })`** — sparse durable domain events (research-task state transitions, project transitions, work-item failures). Helpful for citation. Lower volume than `claude_agent_events`; do not treat absence here as "stuck" on its own.
6. **`list_feed_entries({ limit: 3 })`** — your own prior narrations. Do not restate them; find a different angle.

## Diagnostic playbook

Apply these heuristics in order; the first match wins.

- If `list_claude_agent_events` returns zero rows in the last several minutes AND `list_work_items({ status: "claimed" })` is also empty → genuinely idle. Narrate as a quiet wait and name what the system is waiting on (e.g. pending user confirmation in onboarding, an unclaimed pending work item, or compute headroom).
- If a claimed work item has `attempt > 1` OR was claimed more than ~10 minutes ago → flag as a stuck claim or retry storm. Cite the work item id and purpose.
- If `list_claude_agent_events` shows many `agent.custom_tool_use` rows without matching `user.custom_tool_result` rows over the same window → the agent is mid-tool-call. Narrate as active work, not stuck.
- If `list_claude_agent_events` is rising and `list_work_items({ status: "claimed" })` has a research-task purpose claimed → narrate what role is working on what task (read the matching research task title).
- If a recent verified research task moved the metric → narrate the win, citing the task title and the verification status.

## Decide severity

- `info` — narrative update, nothing alarming.
- `progress` — something concretely advanced (task verified, baseline confirmed, experiment completed, kept commit).
- `stuck` — waiting on user input, a stuck claim, a retry storm, or compute headroom. Only use when the evidence above supports it.
- `failure` — a research task or work item is in terminal `failed` state.

## Output shape

Call `write_feed_entry` once. Required fields: `summaryMarkdown`, `severity`, `citedAppEventIds`, `windowStartedAt`, `windowEndedAt`. Use the window boundaries from your queries: `windowStartedAt` is the `since` you passed to the queries above (or your prior feed entry's `windowEndedAt`); `windowEndedAt` is now.

Keep `summaryMarkdown` to 1–2 short paragraphs. Cite app event ids inline (e.g., `(evt_abc123)`) when you reference specific domain events. Do not output prose outside the tool call.

Vary phrasing across consecutive quiet narrations. Do not invent activity that isn't in the event log.
