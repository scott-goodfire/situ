#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$REPO_ROOT"

uv run python scripts/check-python-syntax.py
./commands/protocol-generate.sh
bun run check
