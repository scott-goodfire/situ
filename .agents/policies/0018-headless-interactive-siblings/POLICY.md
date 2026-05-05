---
title: Headless Interactive Siblings
status: active
---

# Policy: Headless Interactive Siblings

## Applies To

The TypeScript Ink TUI, attach-only web monitor, Python CLI, local session
server, JSON-RPC client/server code, collection layer, and any future commands
intended for agents, scripts, CI, or automation.

## Rule

Human-facing interactive surfaces and agent-facing headless surfaces should be
siblings over the same session backend, not wrappers around each other.

The TUI and web monitor should make a live research session understandable to a
human. Headless commands should make the same session state and lifecycle
usable by agents and automation without requiring a terminal UI, keystrokes, or
screen scraping.

## Required Checks

- Keep `situ start` human-first. It may launch the local session server and
  TUI, but should not be the only way to run the session lifecycle.
- Add agent/CI flows as explicit headless commands such as `situ exec`,
  `situ status --json`, `situ snapshot --json`,
  `situ events --json`, and `situ wait --json`.
- Headless commands must work without a TTY. They must not render Ink, depend on
  raw mode, require interactive prompts, or rely on cursor-control output.
- Headless commands should talk to the same session server, JSON-RPC methods,
  collection bootstrap, and event stream that the TUI/web surfaces use.
- Do not duplicate research-loop behavior in a separate automation-only code
  path. Shared lifecycle logic belongs below the surfaces.
- Prefer machine-readable output contracts:
  - JSON for snapshots and final summaries.
  - JSON Lines for streaming events.
  - Stable event names and record shapes that agents can parse.
- Keep progress and diagnostics separate from machine data. For streaming
  commands, reserve stdout for JSON/JSONL or the final requested artifact, and
  write human progress to stderr.
- Provide explicit automation controls instead of hidden interactive defaults:
  workspace, output format, max experiments, timeout, ephemeral/local state,
  config loading, and final summary output path.
- Preserve local/private defaults. Headless mode may create local Situ state,
  but should not write to the observed repo unless the user explicitly asks.
- Define predictable exit codes for success, failed session, bad configuration,
  timeout, and interrupted execution.
- Ensure headless commands clean up child processes and session records on
  normal exit, failure, interrupt, and timeout.
- If a product-significant TUI capability cannot be represented headlessly yet,
  call that out in the relevant spec or implementation plan instead of letting
  the surfaces silently diverge.

## Red Flags

- A script runs the TUI with auto-exit and parses the screen as the primary
  automation path.
- A headless command reimplements session execution instead of driving the
  shared backend.
- JSON output is mixed with human status lines on stdout.
- An agent must inspect SQLite directly to answer ordinary status questions.
- A command hangs forever because it assumes a human can press a key.
- A feature exists only as a slash command or keyboard shortcut when agents also
  need it.
- A web or TUI surface starts or restarts harness sessions implicitly in a way
  headless commands cannot observe or control.

## Review Questions

- Can an agent run the same workflow in CI without a TTY?
- Is the machine-readable output stable enough to parse with `jq`?
- Are session lifecycle, collection state, and event streams shared across
  TUI, web, and headless commands?
- Are progress logs and structured data kept on separate streams?
- Are timeout, interrupt, and failure states observable and testable?
- Does the implementation make the TUI better without making automation depend
  on the TUI?
