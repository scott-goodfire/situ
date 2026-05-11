---
outline: deep
---

# CLI

`situ` is the CLI for Claude-powered autoresearch sessions. Installed copies live
at `~/.local/bin/situ`; runtime data — session SQLite databases, saved secrets,
and the launch registry — lives under `~/.situ`.

## Synopsis

```bash
situ app [--host 127.0.0.1] [--port 5500] [--resume] [--session <id>]
situ exec --objective "<text>" [--timeout 600] [--host 127.0.0.1] [--port 5500] [--resume] [--session <id>] [--json]
situ exec --resume [--objective "<text>"] [--timeout 600] [--host 127.0.0.1] [--port 5500] [--json]
situ resume <session-id> [--objective "<text>"] [--timeout 600] [--host 127.0.0.1] [--port 5500] [--json]
situ status [--session <id>] [--json]
situ sessions [--all] [--json]
situ events [--session <id>] [--limit 20] [--follow] [--json]
situ compute list --session <id> [--pool <name>] [--status <status>] [--limit 50] [--json]
situ compute add --session <id> [--pool local] [--kind local] [--label <label>] [--cuda-visible-devices <devices>] [--json]
situ compute drain <target-id> --session <id> [--json]
situ compute restore <target-id> --session <id> [--json]
situ compute remove <target-id> --session <id> [--force] [--json]
situ instructions
situ skill install
situ skill uninstall
situ skill show-path
situ self-update [version] [--json]
situ doctor [--json]
situ version
situ --version
```

## Global behavior

- Running `situ` with no command is equivalent to `situ app`.
- `--help` and `-h` are accepted on every command and print a usage line.
- `--version` and `-v` print the installed version and short git SHA.
- Commands that touch session state accept `--session <id>` to target a specific
  session, and the read-only commands fall back to the most recent session for
  the current working directory when `--session` is omitted.
- Most commands accept `--json` for machine-readable output suitable for piping.

## Session commands

### `situ app`

Boots the local situ web app. In dev (running from source) Vite is mounted as
middleware so you get HMR without a second port; from an installed binary the
same routes serve the pre-built SPA.

```bash
situ app [--host 127.0.0.1] [--port 5500] [--resume] [--session <id>]
```

| Flag             | Default     | Description                                                     |
| ---------------- | ----------- | --------------------------------------------------------------- |
| `--host <host>`  | `127.0.0.1` | Bind address                                                    |
| `--port <port>`  | `5500`      | Port. When omitted, situ falls forward to the next free port.   |
| `--resume`       | —           | Reuse the most recent session for the current working directory |
| `--session <id>` | —           | Resume a specific session by id                                 |

```bash
situ app                                    # http://127.0.0.1:5500, or next free port
SITU_ANTHROPIC_KEY=sk-ant-... situ app
situ app --port 4400 --resume
```

### `situ exec`

Runs a headless session — drives the automation loop until idle and prints the
outcome. Useful for scripting or CI.

```bash
situ exec --objective "<text>" [--timeout 600] [--host 127.0.0.1] [--port 5500] [--resume] [--session <id>] [--json]
situ exec --resume [--objective "<text>"] [--timeout 600] [--host 127.0.0.1] [--port 5500] [--json]
```

| Flag                     | Default     | Description                                                                               |
| ------------------------ | ----------- | ----------------------------------------------------------------------------------------- |
| `-o, --objective <text>` | —           | The research goal for the session. Required unless `--resume` or `--session` is provided. |
| `--host <host>`          | `127.0.0.1` | Bind address. Uses the same server as the app UI.                                         |
| `--port <port>`          | `5500`      | Port. When omitted, situ falls forward to the next free port.                             |
| `--timeout <seconds>`    | `600`       | Maximum wall-clock seconds the automation loop will run                                   |
| `--resume`               | —           | Resume the most recent session for the current working directory                          |
| `--session <id>`         | —           | Resume a specific session by id                                                           |
| `--json`                 | —           | Print machine-readable summary instead of progress lines                                  |

Exit code is `0` when the loop reaches idle, `2` on timeout, and `3` when the run is blocked on pending user input.
While running, `situ exec` prints `[situ-exec]` status lines and the web UI URL
to stderr for live inspection. With `--json`, the final stdout payload includes
`webUrl`.

```bash
situ exec --objective "Investigate the current task" --timeout 600
situ exec --resume --timeout 300
situ exec --session sit_abc... --objective "Continue from here"
```

### `situ resume`

Convenience wrapper for resuming a session by id. Equivalent to
`situ exec --resume --session <session-id> [...rest]`.

```bash
situ resume <session-id> [--objective "<text>"] [--timeout 600] [--json]
```

```bash
situ resume sit_abc123
situ resume sit_abc123 --objective "Add the missing tests"
```

### `situ status`

Prints a one-glance summary of the latest (or specified) session: state,
objective, and counts of research tasks, work items, Claude runs, and
hypotheses, grouped by status. Read-only.

```bash
situ status [--session <id>] [--json]
```

| Flag             | Default        | Description                 |
| ---------------- | -------------- | --------------------------- |
| `--session <id>` | latest for cwd | Which session to summarize  |
| `--json`         | —              | Print the raw status object |

### `situ sessions`

Lists known sessions from `~/.situ/registry.json`. By default only sessions for
the current working directory are shown; pass `--all` for every workspace.

```bash
situ sessions [--all] [--json]
```

| Flag     | Default | Description                               |
| -------- | ------- | ----------------------------------------- |
| `--all`  | —       | Include sessions from other workspaces    |
| `--json` | —       | Print the raw `{ sessions: [...] }` array |

```bash
situ sessions               # tab-separated: id<TAB>lastOpenedAt<TAB>repoPath
situ sessions --all --json
```

### `situ events`

Streams events from a session's SQLite database — both situ app events and
Claude agent events, ordered by time. Read-only.

```bash
situ events [--session <id>] [--limit 20] [--follow] [--json]
```

| Flag             | Default        | Description                                                 |
| ---------------- | -------------- | ----------------------------------------------------------- |
| `--session <id>` | latest for cwd | Which session to read from                                  |
| `--limit <n>`    | `20`           | Max events per poll                                         |
| `--follow`       | —              | Keep tailing new events (polls every second)                |
| `--json`         | —              | Emit one JSON object per line instead of tab-separated text |

```bash
situ events                          # last 20 events
situ events --follow --limit 50      # tail live
situ events --session sit_abc --json | jq .
```

## Operational commands

### `situ compute`

Manages compute targets — the local pool entries that situ leases when running
experiment worktrees. Compute state is per-session, so every compute subcommand
requires an explicit `--session`; `--resume` is not supported for compute.

```bash
situ compute list    --session <id> [--pool <name>] [--status <status>] [--limit 50] [--json]
situ compute add     --session <id> [--pool local]  [--kind local]      [--label <label>] [--cuda-visible-devices <devices>] [--json]
situ compute drain   <target-id> --session <id> [--json]
situ compute restore <target-id> --session <id> [--json]
situ compute remove  <target-id> --session <id> [--force] [--json]
```

`<status>` is one of `idle`, `claimed`, `draining`, `dead`.

| Flag (varies by subcommand)        | Default       | Description                                                 |
| ---------------------------------- | ------------- | ----------------------------------------------------------- |
| `--pool <name>`                    | `local` (add) | Pool to target                                              |
| `--kind <kind>`                    | `local` (add) | Compute target kind                                         |
| `--status <status>`                | —             | Filter list results                                         |
| `--limit <n>`                      | `50` (list)   | Cap list results                                            |
| `--label <label>`                  | —             | Human-readable label for the target                         |
| `--cuda-visible-devices <devices>` | —             | Shorthand that injects `CUDA_VISIBLE_DEVICES` into metadata |
| `--session <id>`                   | —             | Required session that owns the compute target state         |
| `--force`                          | —             | `remove`: drop a target even if it is currently claimed     |
| `--json`                           | —             | Print structured output                                     |

```bash
situ compute list --session ses_abc123 --pool local --status idle
situ compute add --session ses_abc123 --pool local --label "GPU 0" --cuda-visible-devices 0
situ compute drain ct_abc123 --session ses_abc123
situ compute remove ct_abc123 --session ses_abc123 --force
```

### `situ instructions`

Prints a guided first-run setup script for an AI coding agent to follow when
helping a user configure situ and launch their first research project. Pair
with [`situ skill install`](#situ-skill) to make the same body available as
the `/situ` slash command inside Claude Code.

```bash
situ instructions
```

```bash
situ instructions > SITU_SETUP.md
```

### `situ skill`

Manages the situ [Claude Code](https://claude.ai/code) skill — a copy of the
`situ instructions` body with frontmatter, installed under `~/.claude/skills`
so it shows up as the `/situ` slash command.

```bash
situ skill install
situ skill uninstall
situ skill show-path
```

| Subcommand  | Description                                              |
| ----------- | -------------------------------------------------------- |
| `install`   | Write `~/.claude/skills/situ/SKILL.md`. Idempotent.      |
| `uninstall` | Remove the installed file and its (now-empty) directory. |
| `show-path` | Print the install path.                                  |

### `situ doctor`

Diagnoses the local install: reports the runtime skill source directory and
checks each role's `SKILL.md` is present. Makes no network calls.

```bash
situ doctor [--json]
```

| Flag     | Default | Description                         |
| -------- | ------- | ----------------------------------- |
| `--json` | —       | Emit a structured diagnostic object |

### `situ self-update`

Updates the installed `situ` binary in place from a GitHub release. Without a
version it pulls the latest; with one it pins to that release.

```bash
situ self-update [version] [--json]
```

| Flag        | Default | Description                   |
| ----------- | ------- | ----------------------------- |
| `[version]` | latest  | Release tag (e.g. `v0.1.0`)   |
| `--json`    | —       | Print update metadata as JSON |

```bash
situ self-update
situ self-update v0.1.0
```

### `situ version`

Prints the installed version and short git SHA. `--version` and `-v` work the
same way.

```bash
situ version
situ --version
situ -v
```

## Environment variables

Selected variables that affect CLI behavior:

| Variable                         | Effect                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| `SITU_ANTHROPIC_KEY`             | Anthropic API key used by every Claude call. Takes precedence over the key saved through the UI. |
| `SITU_HOME`                      | Runtime data root. Defaults to `~/.situ`.                                                        |
| `SITU_REPO_PATH`                 | Repo to associate with a session. Defaults to the launch directory.                              |
| `MAX_SITU_SCIENTIST_CONCURRENCY` | Maximum concurrent Scientist work items before compute-target limits. Defaults to `4`.           |

## See also

- [Getting started](/getting-started) — install + first run
- Source: [`projects/app/src/cli`](https://github.com/scott-goodfire/situ/tree/main/projects/app/src/cli)
