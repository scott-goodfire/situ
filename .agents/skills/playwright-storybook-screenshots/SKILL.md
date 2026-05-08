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

## Storybook Workflow

Use the package-specific Storybook tasks:

```bash
mise run storybook:web
mise run storybook:ui
```

Use the corresponding build tasks before finishing broad UI changes:

```bash
mise run storybook:web:build
mise run storybook:ui:build
```

When screenshots are needed, start the relevant Storybook task and capture the
specific stories with Playwright MCP. Put generated screenshots under `/tmp`,
not in the repo.

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
for visual changes; run the relevant Storybook build before finishing.

## Review Expectations

- Storybook stories should not require a live Situ session.
- Screenshots should cover empty, loading, connected, failed, running,
  completed, and suspicious states when those states change.
- Keep screenshot fixtures local and deterministic.
- If screenshots reveal layout problems, fix the component and rerun the
  relevant Storybook build.
