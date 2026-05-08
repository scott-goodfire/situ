#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

export SITU_PREFER_SOURCE_RUNTIMES=1
uv run --package situ-harness situ resume "$@"
