#!/usr/bin/env bash
# Build a per-platform Situ release tarball plus its checksum.
# Output lands in dist/release/. The harness wheel contains the _bundled/
# runtimes for the target platform.
#
# Usage:
#   SITU_TARGET=bun-darwin-arm64 config/scripts/build_release_assets.sh
#   SITU_TARGET=bun-darwin-x64   config/scripts/build_release_assets.sh
#   SITU_TARGET=bun-linux-arm64  config/scripts/build_release_assets.sh
#   SITU_TARGET=bun-linux-x64    config/scripts/build_release_assets.sh
#   config/scripts/build_release_assets.sh                      # host target

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET="${SITU_TARGET:-host}"

read_version() {
  python3 -c "import re,sys; t=open('$REPO_ROOT/projects/harness/pyproject.toml').read(); m=re.search(r'^version\s*=\s*\"([^\"]+)\"', t, re.M); print(m.group(1) if m else 'unknown')"
}

VERSION="${SITU_VERSION:-$(read_version)}"

case "$TARGET" in
  bun-darwin-arm64) PLATFORM="darwin-arm64" ;;
  bun-darwin-x64)   PLATFORM="darwin-x64" ;;
  bun-linux-arm64)  PLATFORM="linux-arm64" ;;
  bun-linux-x64)    PLATFORM="linux-x64" ;;
  host)
    OS_LOWER="$(uname -s | tr '[:upper:]' '[:lower:]')"
    ARCH_RAW="$(uname -m)"
    case "$ARCH_RAW" in
      arm64|aarch64) ARCH="arm64" ;;
      x86_64|amd64)  ARCH="x64" ;;
      *) ARCH="$ARCH_RAW" ;;
    esac
    PLATFORM="${OS_LOWER}-${ARCH}"
    ;;
  *) echo "unknown SITU_TARGET: $TARGET" >&2; exit 1 ;;
esac

DIST_DIR="$REPO_ROOT/dist/release"
STAGE_DIR="$DIST_DIR/staging-${PLATFORM}"
TARBALL_NAME="situ-v${VERSION}-${PLATFORM}.tar.gz"
TARBALL="$DIST_DIR/$TARBALL_NAME"

echo "==> building release v$VERSION for $PLATFORM (target=$TARGET)"

rm -rf "$STAGE_DIR" "$TARBALL"
mkdir -p "$STAGE_DIR/wheels" "$DIST_DIR"

echo "==> populating bundled runtimes"
SITU_TARGET="$TARGET" "$REPO_ROOT/config/scripts/build_bundled.sh"

echo "==> building harness wheel"
uv build \
  --wheel \
  --project "$REPO_ROOT/projects/harness" \
  --out-dir "$STAGE_DIR/wheels"

echo "==> building protocol wheel"
uv build \
  --wheel \
  --project "$REPO_ROOT/shared/python/protocol" \
  --out-dir "$STAGE_DIR/wheels"

cat > "$STAGE_DIR/MANIFEST" <<MANIFEST
situ-version: ${VERSION}
situ-platform: ${PLATFORM}
situ-target: ${TARGET}
situ-tarball: ${TARBALL_NAME}
MANIFEST

echo "==> creating tarball"
tar -czf "$TARBALL" -C "$STAGE_DIR" .

echo "==> writing checksum"
(
  cd "$DIST_DIR"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$TARBALL_NAME" > checksums.txt
  else
    shasum -a 256 "$TARBALL_NAME" > checksums.txt
  fi
)

echo "==> built $TARBALL"
du -h "$TARBALL"
