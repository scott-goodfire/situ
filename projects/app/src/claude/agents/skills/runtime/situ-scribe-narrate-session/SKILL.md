---
name: situ-scribe-narrate-session
description: Per-turn task skill for the situ Scribe when narrating a session window.
---

# Narrate Session Window

This turn you receive a window of new app events and a session snapshot. Produce exactly one feed entry.

## Decide what to say

- If the window includes failures or blockers, lead with what's stuck and why, and reference the specific event IDs.
- If the window shows progress (tasks moving forward, verifications passing), say what's progressing and what it unblocks.
- If the window is mostly quiet, acknowledge the wait — but vary phrasing from your last quiet note. Mention what the system is waiting on if known.

## Decide severity

- `info` — narrative update, nothing alarming
- `progress` — something concretely advanced (task verified, baseline confirmed, experiment completed)
- `stuck` — waiting on user input, compute, or external dependency
- `failure` — a research task or work item failed

## Output

Call `write_feed_entry` once. Required fields: `summaryMarkdown`, `severity`, `citedAppEventIds`, `windowStartedAt`, `windowEndedAt`. The window timestamps come from the user message in this turn — use them verbatim.

Keep `summaryMarkdown` to 1–2 short paragraphs. Cite event IDs inline (e.g., `(evt_abc123)`). Do not output prose outside the tool call.
