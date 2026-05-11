#!/usr/bin/env bash
set -euo pipefail

printf '\n[fallow:audit] changed-file quality gate\n'
RUST_LOG="${RUST_LOG:-error}" bun x fallow audit "$@"
