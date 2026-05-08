#!/usr/bin/env bash
# Populate projects/harness/src/situ/_bundled/ with the runtime artifacts the
# installed Situ CLI exec's at runtime. See .agents/specs/0017-distribution-and-install/SPEC.md.
#
# Usage:
#   config/scripts/build_bundled.sh                  # builds for host platform
#   SITU_TARGET=bun-darwin-arm64 config/scripts/...  # cross-compile target
#
# Recognised SITU_TARGET values:
#   host (default), bun-darwin-arm64, bun-darwin-x64,
#   bun-linux-arm64, bun-linux-x64

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET="${SITU_TARGET:-host}"
OUT_DIR="$REPO_ROOT/projects/harness/src/situ/_bundled"

case "$TARGET" in
  host)
    BUN_TARGET_ARGS=()
    ;;
  bun-darwin-arm64|bun-darwin-x64|bun-linux-arm64|bun-linux-x64)
    BUN_TARGET_ARGS=(--target="$TARGET")
    ;;
  *)
    echo "unknown SITU_TARGET: $TARGET" >&2
    echo "expected one of: host, bun-darwin-arm64, bun-darwin-x64, bun-linux-arm64, bun-linux-x64" >&2
    exit 1
    ;;
esac

echo "==> building bundled runtimes for target=$TARGET"

# Clean prior output but preserve __init__.py and .gitignore.
find "$OUT_DIR" -mindepth 1 -maxdepth 1 \
  ! -name "__init__.py" \
  ! -name ".gitignore" \
  -exec rm -rf {} +

mkdir -p "$OUT_DIR"

cd "$REPO_ROOT"

echo "==> compiling session-server"
bun build \
  --compile \
  ${BUN_TARGET_ARGS[@]+"${BUN_TARGET_ARGS[@]}"} \
  --outfile "$OUT_DIR/session-server" \
  projects/session-server/src/main.ts

echo "==> compiling tui"
bun build \
  --compile \
  ${BUN_TARGET_ARGS[@]+"${BUN_TARGET_ARGS[@]}"} \
  --outfile "$OUT_DIR/tui" \
  projects/tui/src/main.tsx

echo "==> building web frontend"
bun run --filter @situ/web build
cp -R "$REPO_ROOT/projects/web/dist" "$OUT_DIR/web"

echo "==> bundled artifacts at $OUT_DIR"
ls -la "$OUT_DIR"
