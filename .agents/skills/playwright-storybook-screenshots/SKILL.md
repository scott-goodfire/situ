---
name: playwright-storybook-screenshots
description: Use when inspecting Situ web UI with Playwright, capturing Storybook screenshots, verifying visual states, or using the Playwright MCP server for browser-driven UI review.
---

# Playwright Storybook Screenshots

## When To Use

Use this skill for browser UI review, Storybook visual checks, screenshot
capture, and Playwright MCP-driven inspection of the Situ web UI.

Prefer fixture-driven Storybook screenshots for repeatable component review. Use
the MCP browser when interactive inspection is needed.

## Screenshot Workflow

Run:

```bash
mise run storybook:screenshots
```

The command starts Storybook, reads `index.json`, captures every story with
Playwright Chromium, and writes PNGs under:

```text
/tmp/situ-storybook-screenshots/<timestamp>/<component>/<story>.png
```

It also writes `stories.json` in the screenshot root so the captured story list
is reviewable.

Useful options:

```bash
mise run storybook:screenshots -- --out-dir /tmp/situ-shot-pass
mise run storybook:screenshots -- --port 6010
mise run storybook:screenshots -- --base-url http://127.0.0.1:6006 --no-start
```

## MCP Setup

This repo includes `.codex/config.toml` as a project reference for the
Playwright MCP server.

Codex normally reads MCP configuration from `~/.codex/config.toml`. If the local
project config is not picked up by the client, copy the Playwright stanza from
`.codex/config.toml` into `~/.codex/config.toml` or run:

```bash
codex mcp add playwright npx "@playwright/mcp@latest"
```

Use MCP for ad hoc inspection only. Do not rely on MCP as the only verification
for visual changes; run the deterministic screenshot command before finishing.

## Review Expectations

- Storybook stories should not require a live Situ session.
- Screenshots should cover empty, loading, connected, failed, running,
  completed, and suspicious states when those states change.
- Put generated screenshots under `/tmp`, not in the repo.
- Keep screenshot fixtures local and deterministic.
- If screenshots reveal layout problems, fix the component and rerun the command.
