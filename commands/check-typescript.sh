#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$REPO_ROOT"

bun --filter @almanac/protocol check
bun --filter @almanac/chart-model check
bun --filter @almanac/chart-model test
bun --filter @almanac/rpc-client check
bun --filter @almanac/collections check
bun --filter @almanac/collections test
bun --filter @almanac/session-server check
bun --filter @almanac/e2e-tests check
bun --filter @almanac/tui-ui check
bun --filter @almanac/tui-ui test
bun --filter @almanac/tui check
bun --filter @almanac/web-ui check
bun --filter @almanac/web check
