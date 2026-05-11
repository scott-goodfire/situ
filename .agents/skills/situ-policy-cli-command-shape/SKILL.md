---
name: situ-policy-cli-command-shape
description: Use whenever adding, modifying, or reviewing a CLI command under projects/app/src/cli — including argv parsing, dispatch logic, output formatting, or new subcommands.
---

# CLI Command Shape

Every command in `cli/` follows the same shape: parse args → ensure context (if needed) → dispatch on `kind` → return exit code.

## Rules

- File name: `<area>-command.ts` (single command) or `<area>-commands.ts`
  (small group).
- Result-output helpers live in `cli/__shared__`. Generic argv helpers and
  CAC-backed option parsing live in `modules/command-line`.
- Entry function: `({ argv }: { argv: string[] }): Promise<number>`.
- Argument parsing builds a discriminated union typed locally
  (`type SkillCommand = { kind: "install"; ... } | { kind: "uninstall"; ... }`).
- Command option parsing uses `commandLineModule.parseOptions` unless the
  command has parser behavior CAC cannot model cleanly.
- Commands that read or write session state call `ensureRuntimeContext({ sessionId })` before dispatching.
- Result output goes through `printResult({ json, value, text })` from `cli/__shared__`. Help text and progress streams are exempt.
- Exit codes are numeric returns. `process.exit(0)` only for early-exit (`--help`, version); `process.exit(1)` only at the top of stand-alone scripts.
- Session-bound commands accept `json` and explicit `sessionId` when they emit JSON or target session state. Sessionless commands accept `json` when they emit JSON.

## Exceptions

- Sessionless commands (`self-update`, `doctor`) skip `ensureRuntimeContext` — they operate on install paths or runtime data only.
- `situ compute` is a read-only diagnostic surface. It requires an explicit
  `--session` and does not register compute. Compute registration belongs to
  fresh `situ exec --objective ...` launches through `--compute-pool`,
  `--compute-kind`, `--compute-label`, and `--cuda-visible-devices`.

## Avoid

- A file defines its own `printResult` instead of importing from `cli/__shared__`.
- A command file defines its own generic `requireValue`, positive-integer
  parser, or hand-written option scanner instead of using
  `commandLineModule`.
- State-bearing work runs before `ensureRuntimeContext` resolves.
- Argument parsing is split across modules instead of one `parse<Area>Command`.
- Result output mixes `console.log` and `printResult`.
- A command throws to signal a non-zero exit instead of returning the code.

## See also

- `situ-policy-barrel-exports`
- `situ-policy-error-throwing`
- `situ-policy-logging`
