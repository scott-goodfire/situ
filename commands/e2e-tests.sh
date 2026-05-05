#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)

if command -v zsh >/dev/null 2>&1 && [ -f "${HOME}/.zshrc" ]; then
  exec zsh -lc 'source "${HOME}/.zshrc"; cd "$1"; shift; bun --filter @almanac/e2e-tests test "$@"' almanac-e2e "$REPO_ROOT" "$@"
fi

cd "$REPO_ROOT"
bun --filter @almanac/e2e-tests test "$@"
