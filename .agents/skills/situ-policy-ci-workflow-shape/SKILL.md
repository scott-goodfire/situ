---
name: situ-policy-ci-workflow-shape
description: Use whenever adding, modifying, or reviewing GitHub Actions workflows under .github/workflows.
---

# CI Workflow Shape

Workflows install mise once and delegate every check to `mise run <task>`.
Stateful steps isolate their `SITU_*` env vars under `runner.temp`.

## Rules

- Workflow file lives at `.github/workflows/<name>.yml`.
- `permissions:` is declared explicitly at the workflow or job level
  (`contents: read` for read-only, `contents: write` for releases).
- Each job's first non-checkout step is `jdx/mise-action@v2` with
  `install: true` and `cache: true`. No inline `setup-node`,
  `setup-python`, etc.
- After `mise-action`, run `bun install --frozen-lockfile`, then call
  `mise run <task>` for each check. Keep tools in `mise.toml`, not in
  workflow YAML.
- Stateful steps that exercise installed binaries set
  `SITU_HOME: ${{ runner.temp }}/state`,
  `SITU_INSTALL_HOME: ${{ runner.temp }}/situ`,
  `SITU_BIN_DIR: ${{ runner.temp }}/bin` so the runner's `~/.situ` is
  never touched.
- Matrix entries use object form
  (`{ runner: macos-14, platform: darwin-arm64 }`) so they're readable.
- Workflow YAML is linted by **actionlint** (`mise run actionlint`,
  also wired into `mise run check` and the lefthook pre-commit when
  workflow files are staged). Catches typos, expression errors, and
  shellcheck-style issues in `run:` blocks before merge.

## Avoid

- A workflow that pins Node / Python / Bun in YAML instead of mise.
- A check step that reaches outside `mise run` (e.g., calls `bun x`
  or `npm x` directly).
- A release-smoke step that sets `SITU_INSTALL_HOME` but forgets
  `SITU_HOME`.
- `permissions:` left at the default
  (varies by token; declare explicitly).

## See also

- `situ-policy-distribution-install`
- `situ-policy-eval-strategy`
- `situ-policy-release-script-shape`
