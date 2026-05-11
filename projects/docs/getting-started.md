# Getting started

situ uses [Claude Managed Agents](https://platform.claude.com/docs/en/managed-agents/overview)
to run autoresearch on your codebase. Give it a goal, and the Manager first
creates a durable project baseline for confirmation. After that baseline is
confirmed and the project enters `search`, situ plans research tasks, runs
experiments, records measurements, and verifies findings you can inspect in a
local web UI.

The app and session database run on your machine. Claude calls require network
access and an Anthropic API key.

## Run from source

```bash
mise run update
SITU_ANTHROPIC_KEY=sk-ant-... mise run app
```

Open the printed local URL and start a research project.

You can also save the key through the UI:

```bash
mise run update
mise run app
```

## Install a release

```bash
curl -fsSL https://raw.githubusercontent.com/scott-goodfire/situ/main/config/scripts/install.sh | bash
SITU_ANTHROPIC_KEY=sk-ant-... situ app
```

The installer writes the launcher to `~/.local/bin/situ` and keeps versioned app
files under `~/.local/share/situ`.

## Set up with Claude Code

If you use [Claude Code](https://claude.ai/code), it can walk you through
first-run setup, configure your Anthropic key, pick a target directory, launch
situ, let the Manager save or confirm the setup baseline, and narrate live
progress from the event log.

```bash
# After installing situ
situ skill install
```

This writes `~/.claude/skills/situ/SKILL.md`. In any Claude Code session, type
`/situ` to invoke it. The same body is also available as `situ instructions`
(stdout) if you'd rather paste it manually, and `situ skill uninstall` removes
the installed file.

## Run headless

Use `situ exec` when you want the research loop to run from the terminal:

```bash
situ exec \
  --objective "Investigate whether the cache invalidation bug is still reproducible" \
  --timeout 600
```

From source, use the matching mise task:

```bash
mise run exec -- \
  --objective "Investigate the current task" \
  --timeout 600
```

Headless `situ exec` auto-confirms baseline confirmations only after the
Manager has saved a durable project baseline. ResearchTasks still wait until the
project reaches `search`.

`situ exec` starts the same local app runtime as `situ app`, including the web
server and scheduler, then stops that runtime when the run becomes idle or
times out. The printed web URL stays available while the command is running.

## Continue and inspect

```bash
situ sessions
situ exec --session <session-id> --timeout 300
situ status
situ events --follow
```

Most commands target the latest session for the current working directory. Pass
`--session <id>` when you want a specific session.

Compute targets are registered only when launching a fresh
`situ exec --objective ...` run with flags such as `--compute-pool`,
`--compute-label`, and `--cuda-visible-devices`. Session-only exec commands do
not register compute.
