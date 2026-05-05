#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$REPO_ROOT"

bun --filter @situ/protocol check
bun --filter @situ/chart-model check
bun --filter @situ/chart-model test
bun --filter @situ/rpc-client check
bun --filter @situ/collections check
bun --filter @situ/collections test
bun --filter @situ/session-server check
bun --filter @situ/e2e-tests check
bun --filter @situ/tui-ui check
bun --filter @situ/tui-ui test
bun --filter @situ/tui check
bun --filter @situ/web-ui check
bun --filter @situ/web-app-ui check
bun --filter @situ/web check
bun --filter @situ/web test
