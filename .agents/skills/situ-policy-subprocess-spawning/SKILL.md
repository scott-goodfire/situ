---
name: situ-policy-subprocess-spawning
description: Use whenever spawning, modifying, or reviewing subprocesses (git, install, gh, shell commands) under projects/app/src.
---

# Subprocess Spawning

Use `Bun.spawnSync` with captured stdout / stderr.

## Why

Shell-string interpolation is the injection vector. Argv arrays let arguments contain whitespace, quotes, or `$` without surprises — even when the agent supplies the command. Captured stderr means a non-zero exit can tell us what went wrong.

## Rules

- `Bun.spawnSync({ cmd: [...], stdout: "pipe", stderr: "pipe" })`. Output
  is always captured, never inherited.
- Check the exit code; non-zero exits throw with the command and captured
  stderr.
- Set `cwd` when the process must run outside the current directory
  (e.g., git inside worktrees).
- Pass arguments as a string array. Shell metacharacters must not be
  interpolated into one command string.

## Exceptions

- Explicit shell-runner functions like `runtime/worktrees/run-experiment-workspace-command.ts` use `["/bin/zsh", "-lc", command]` so the agent-supplied `command` travels as its own argv element. The shell exists; the injection vector doesn't.
- Async `Bun.spawn` is acceptable for streaming or background processes. Default to `Bun.spawnSync`.

## Avoid

- `child_process.exec` / `execSync` / `spawn` from `node:child_process`.
- A command string built with template-literal interpolation and passed
  to a shell.
- A subprocess fails and the captured stderr is discarded.
- Two subprocess helpers in different modules duplicating wrap logic
  instead of sharing one.

## See also

- `situ-policy-error-throwing`
- `situ-policy-filesystem-access`
