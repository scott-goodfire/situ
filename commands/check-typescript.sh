#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$REPO_ROOT"

bun --filter @almanac/protocol check
bun --filter @almanac/rpc-client check
bun --filter @almanac/collections check
bun --filter @almanac/collections test
bun --filter @almanac/session-server check
bun --filter @almanac/tui check
bun --filter @almanac/web check
