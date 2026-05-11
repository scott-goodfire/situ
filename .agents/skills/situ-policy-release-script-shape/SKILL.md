---
name: situ-policy-release-script-shape
description: Use whenever adding, modifying, or reviewing release / install / build bash scripts under config/scripts.
---

# Release Script Shape

Bash scripts in `config/scripts/` are safe-by-default and read overrides from `SITU_*` env vars.

## Rules

- Shebang: `#!/usr/bin/env bash`. First line of code: `set -euo pipefail`.
- Overridable settings come from `SITU_*` env vars with sensible defaults:

  ```bash
  REPO="${SITU_RELEASE_REPO:-scott-goodfire/situ}"
  VERSION="${SITU_VERSION:-${1:-latest}}"
  INSTALL_HOME="${SITU_INSTALL_HOME:-$HOME/.local/share/situ}"
  ```

- Script-level helpers are short shell functions, not inline `if`-trees:

  ```bash
  err()  { printf 'error: %s\n' "$*" >&2; exit 1; }
  info() { printf '==> %s\n' "$*"; }
  ```

- Long commands and pipelines are formatted on multiple lines with
  trailing-backslash continuations.
- Temp dirs use `mktemp -d` and clean up with `trap 'rm -rf "$TMP_DIR"' EXIT`.
- Cross-platform helpers cover both GNU and BSD tools where it matters
  (`sha256sum` vs `shasum -a 256`).

## Avoid

- A script without `set -euo pipefail`.
- Hard-coded paths instead of `$HOME`-derived defaults.
- Calling `exit` from deep inside a pipeline — wrap in a function and
  `err` out at the top level.
- A new env var without `SITU_` prefix.
- Cleanup commands placed after `exit` — use `trap` instead.

## See also

- `situ-policy-distribution-install`
- `situ-policy-configuration-env-vars`
