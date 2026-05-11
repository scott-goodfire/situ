# situ - autoresearch harness

[![CI](https://github.com/scott-goodfire/situ/actions/workflows/check.yml/badge.svg)](https://github.com/scott-goodfire/situ/actions/workflows/check.yml)
![Version](https://img.shields.io/badge/version-v0.1.0-2563eb)
[![License: MIT](https://img.shields.io/badge/license-MIT-111827)](./LICENSE)

Run autoresearch on your codebase.

situ uses [Claude Managed Agents](https://platform.claude.com/docs/en/managed-agents/overview)
to orchestrate an autoresearch project on your codebase. Give it a goal, and
situ plans research tasks, runs experiments in isolated worktrees, records
measurements, and verifies findings you can inspect in a local web UI.

[Docs](https://situ.science) | [Getting started](https://situ.science/getting-started) | [CLI reference](https://situ.science/cli)

## Quick Start

Install:

```bash
curl -fsSL https://raw.githubusercontent.com/scott-goodfire/situ/main/config/scripts/install.sh | bash
SITU_ANTHROPIC_KEY=sk-ant-... situ app
```

## Set up with Claude

If you use [Claude Code](https://claude.ai/code), it can walk you
through setup, launch situ, and let the Manager save or confirm a setup
baseline before research tasks run.

```zsh
# Install situ
curl -fsSL https://raw.githubusercontent.com/scott-goodfire/situ/main/config/scripts/install.sh | bash

# Install the Claude Code skill so `/situ` is available in every session
situ skill install

# Then, in any Claude Code session, type:  /situ
```

## Example Usage

Run situ interactively:

```bash
situ app
```

Run a headless research session:

```bash
situ exec \
  --objective "Improve val_bpb. Only modify train.py. Evaluate using `uv run train.py`." \
  --timeout 600
```

Inspect session state:

```bash
situ status
situ events --follow
```

## How It Works

situ creates a local session for the current working directory, starts a local
web/API server, and records runtime state in a per-session SQLite database:

```text
~/.situ/sessions/<session-id>/session.sqlite
```

The runtime dispatches work across three Claude Managed Agent roles:

- **Manager** breaks the goal into research tasks and decides what to run next.
- **Scientist** works in isolated worktrees, runs experiments, and records
  measurements.
- **Verifier** reviews evidence and marks research tasks as accepted or needing
  follow-up.

Before research tasks start, the Manager creates a durable project baseline for
user confirmation. In headless `situ exec`, that confirmation is auto-accepted
only after the baseline has been saved.

## Documentation

- [Getting started](https://situ.science/getting-started)
- [CLI reference](https://situ.science/cli)
- [Docs site source](./projects/docs)

---

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
- `@situ/web-app-ui` - situ-specific page views and fixtures.

## Inspirations

- [autoresearch](https://github.com/karpathy/autoresearch)
- [Letting Claude do autonomous research to improve SAEs](https://www.lesswrong.com/posts/rbqJoxFZtae9x93mx/letting-claude-do-autonomous-research-to-improve-saes)
- [The AI Scientist-v2: Workshop-Level Automated Scientific Discovery via Agentic Tree Search](https://sakana.ai/ai-scientist-nature/)
- [Self-driving codebases](https://cursor.com/blog/self-driving-codebases)
- [You and your research agent](https://www.goodfire.ai/blog/you-and-your-research-agent)
- [Long-running Claude](https://www.anthropic.com/research/long-running-Claude)

## License

situ is distributed under the [MIT License](./LICENSE).
