# Situ

[![CI](https://github.com/scott-goodfire/situ/actions/workflows/check.yml/badge.svg)](https://github.com/scott-goodfire/situ/actions/workflows/check.yml)
![Version](https://img.shields.io/badge/version-v0.1.0-2563eb)
[![License: MIT](https://img.shields.io/badge/license-MIT-111827)](./LICENSE)

Run autoresearch on your codebase.

Situ uses [Claude Managed Agents](https://platform.claude.com/docs/en/managed-agents/overview)
to orchestrate an autoresearch project on your codebase. Give it a goal, and
Situ plans research tasks, runs experiments in isolated worktrees, records
measurements, and verifies findings you can inspect in a local web UI.

Use it from a local web UI or a headless CLI run. The app and session database
run on your machine; Claude calls require network access and an Anthropic API
key.

[Docs](https://situ.science) | [Getting started](https://situ.science/getting-started) | [CLI reference](https://situ.science/cli)

## Why Situ

- **Agent roles with separation of concerns.** Manager plans, Scientist runs
  experiments, and Verifier checks the evidence before findings are promoted.
- **Durable local state.** Projects, tasks, hypotheses, experiments,
  evaluations, measurements, and agent events are stored in SQLite under
  `~/.situ`.
- **One local app.** A single Hono server serves the API and React UI; in dev it
  mounts Vite middleware, and in release builds it serves the bundled SPA.
- **Interactive or headless.** Use the web app to guide a session or run the
  same loop from the CLI for scripted investigations.

## Quick Start

From source:

```bash
mise run update
SITU_ANTHROPIC_KEY=sk-ant-... mise run app
```

Open the printed local URL, save an Anthropic API key if you did not provide
one in the environment, and start a research project.

Installed release:

```bash
curl -fsSL https://raw.githubusercontent.com/scott-goodfire/situ/main/config/scripts/install.sh | bash
SITU_ANTHROPIC_KEY=sk-ant-... situ app
```

## Set up with Claude

If you use [Claude Code](https://claude.ai/code), it can walk you
through first-run setup, configure your Anthropic key, pick a target
directory, launch Situ, and narrate live progress from the event log.

```zsh
# Install Situ
curl -fsSL https://raw.githubusercontent.com/scott-goodfire/situ/main/config/scripts/install.sh | bash

# Install the Claude Code skill so `/situ` is available in every session
situ skill install

# Then, in any Claude Code session, type:  /situ
```

`situ skill install` writes `~/.claude/skills/situ/SKILL.md`. Remove it
later with `situ skill uninstall`. The same body is also available as
`situ instructions` (stdout) if you'd rather paste it manually.

## Example Usage

Run Situ interactively:

```bash
situ app
```

Run a headless research session:

```bash
situ exec \
  --objective "Investigate whether the cache invalidation bug is still reproducible" \
  --timeout 600
```

Resume the latest session for the current repo:

```bash
situ exec --resume --timeout 300
```

Inspect session state:

```bash
situ status
situ events --follow
```

## How It Works

Situ creates a local session for the current working directory, starts a local
web/API server, and records runtime state in a per-session SQLite database:

```text
~/.situ/sessions/<session-id>/session.sqlite
```

The runtime dispatches work across three Claude Managed Agent roles:

- **Manager** breaks the goal into research tasks and decides what to run next.
- **Scientist** works in isolated worktrees, establishes baselines, runs
  experiments, and records measurements.
- **Verifier** reviews evidence and marks research tasks as accepted or needing
  follow-up.

The web app syncs that state locally so you can watch task progress, respond to
human-in-the-loop questions, inspect hypotheses and experiments, and review the
research map.

## Documentation

- [Getting started](https://situ.science/getting-started)
- [CLI reference](https://situ.science/cli)
- [Docs site source](./projects/docs)

## Development

Common source commands:

```bash
mise run update
mise run app
mise run check
mise run e2e-tests
mise run evals
mise run storybook:ui
mise run storybook:app-ui
```

The React SPA lives under `projects/web`. Reusable UI packages live under
`projects/web/packages`:

- `@situ/web-design-tokens` - CSS variables for themes, type, spacing, and
  motion.
- `@situ/web-ui` - reusable `dx-*` primitives.
- `@situ/web-app-ui` - Situ-specific page views and fixtures.

## Distribution

Release builds produce platform tarballs under `dist/release`:

```bash
mise run release:build
SITU_TARGET=bun-linux-x64 mise run release:build
```

Update an installed copy:

```bash
situ self-update
situ self-update v0.1.0
```

Runtime data, saved secrets, and local session databases live under `~/.situ`.
The installed launcher and versioned app files live under `~/.local/bin/situ`
and `~/.local/share/situ`.

## Inspirations

- [autoresearch](https://github.com/karpathy/autoresearch)
- [Letting Claude do autonomous research to improve SAEs](https://www.lesswrong.com/posts/rbqJoxFZtae9x93mx/letting-claude-do-autonomous-research-to-improve-saes)
- [The AI Scientist-v2: Workshop-Level Automated Scientific Discovery via Agentic Tree Search](https://sakana.ai/ai-scientist-nature/)
- [Self-driving codebases](https://cursor.com/blog/self-driving-codebases)
- [You and your research agent](https://www.goodfire.ai/blog/you-and-your-research-agent)
- [Long-running Claude](https://www.anthropic.com/research/long-running-Claude)

## License

Situ is distributed under the [MIT License](./LICENSE).
