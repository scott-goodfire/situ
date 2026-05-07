---
title: Command Task Surface
status: active
---

# Policy: Command Task Surface

## Applies To

Shell wrappers under `commands/*.sh`, `mise.toml` tasks, root `package.json`
scripts, routine development commands, check/eval/storybook/protocol commands,
and small repo scripts under `scripts/**`.

## Rule

Routine command behavior should live in `commands/` and be exposed through
`mise.toml`. Package scripts may provide package-local affordances, but durable
repo workflows should have stable command wrappers that work from any current
directory.

Commands should be thin, explicit, and safe to run repeatedly.

## Required Checks

- New routine repo workflows get a `commands/<name>.sh` wrapper and a matching
  `mise.toml` task when humans or agents should discover them.
- Shell wrappers start with `#!/usr/bin/env bash` and `set -euo pipefail`.
- Shell wrappers resolve `REPO_ROOT` from their own path, then `cd` to the repo
  root or the intentional project directory before running tools.
- Commands that accept caller options forward `"$@"`.
- Use `uv run --package ...` for Python package entrypoints and `bun --filter`
  or a scoped project `bun run` for TypeScript packages.
- Keep command names aligned with product vocabulary: `app`, `tui`, `web`,
  `secrets`, `sessions`, `evals`, `e2e`, `storybook`, and `protocol:generate`.
- Long-running development commands should bind to localhost by default and
  print enough information for a user to attach.
- Structured headless command output must follow the headless/interactive
  policy: machine data on stdout, progress and diagnostics on stderr.
- Commands that touch secrets must not print secret values.
- Protocol changes should be regenerated through `./commands/protocol-generate.sh`,
  not by hand-running generator internals.
- Root `package.json` scripts should delegate to `commands/` for repo-wide
  workflows so Bun, mise, and agents share one command path.

## Red Flags

- Important workflow logic exists only inside `package.json`, `mise.toml`, or a
  README snippet.
- A command relies on the caller's current directory.
- A shell wrapper omits strict mode or fails to forward arguments.
- Multiple commands do almost the same thing but drift in flags, package
  filters, credentials, or output behavior.
- A command writes generated artifacts into source directories by default when
  they are intended to be disposable.
- A check command silently skips a package or generated protocol drift.
- Secrets or tokens appear in command output, logs, events, or trace attributes.

## Review Questions

- Can a future agent find the workflow from `mise.toml`?
- Does the wrapper work from any directory and pass caller options through?
- Is the command thin enough that product logic still lives in application
  code?
- Does stdout/stderr behavior match the intended human or machine consumer?
