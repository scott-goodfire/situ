#!/usr/bin/env bash
# Build a per-platform Situ release tarball plus its checksum.
#
# Usage:
#   SITU_TARGET=bun-darwin-arm64 config/scripts/build_release_assets.sh
#   SITU_TARGET=bun-linux-x64    config/scripts/build_release_assets.sh
#   config/scripts/build_release_assets.sh                  # host target

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET="${SITU_TARGET:-host}"

read_version() {
  sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "$REPO_ROOT/projects/app/package.json" | head -n 1
}

VERSION_INPUT="${SITU_VERSION:-$(read_version)}"
VERSION_NUMERIC="${VERSION_INPUT#v}"
VERSION_TAG="v${VERSION_NUMERIC}"

case "$TARGET" in
  bun-darwin-arm64) PLATFORM="darwin-arm64"; BUN_TARGET_ARGS=(--target="$TARGET") ;;
  bun-darwin-x64)   PLATFORM="darwin-x64";   BUN_TARGET_ARGS=(--target="$TARGET") ;;
  bun-linux-arm64)  PLATFORM="linux-arm64";  BUN_TARGET_ARGS=(--target="$TARGET") ;;
  bun-linux-x64)    PLATFORM="linux-x64";    BUN_TARGET_ARGS=(--target="$TARGET") ;;
  host)
    OS_LOWER="$(uname -s | tr '[:upper:]' '[:lower:]')"
    ARCH_RAW="$(uname -m)"
    case "$ARCH_RAW" in
      arm64|aarch64) ARCH="arm64" ;;
      x86_64|amd64)  ARCH="x64" ;;
      *) ARCH="$ARCH_RAW" ;;
    esac
    PLATFORM="${OS_LOWER}-${ARCH}"
    BUN_TARGET_ARGS=()
    ;;
  *)
    echo "unknown SITU_TARGET: $TARGET" >&2
    exit 1
    ;;
esac

DIST_DIR="$REPO_ROOT/dist/release"
STAGE_DIR="$DIST_DIR/staging-${PLATFORM}"
TARBALL_NAME="situ-${VERSION_TAG}-${PLATFORM}.tar.gz"
TARBALL="$DIST_DIR/$TARBALL_NAME"
GIT_SHA="$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || echo unknown)"
BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "==> building release ${VERSION_TAG} for $PLATFORM (target=$TARGET)"

rm -rf "$STAGE_DIR" "$TARBALL"
mkdir -p "$STAGE_DIR/bin" "$STAGE_DIR/share" "$DIST_DIR"

cd "$REPO_ROOT"

echo "==> building SPA assets"
bun --filter=@situ/app run spa:build
cp -R "$REPO_ROOT/projects/app/dist/spa" "$STAGE_DIR/share/spa"

echo "==> packaging runtime skills"
cp -R "$REPO_ROOT/projects/app/src/claude/agents/skills/runtime" "$STAGE_DIR/share/skills"

echo "==> compiling situ"
SITU_BUILD_VERSION="$VERSION_TAG" \
SITU_BUILD_GIT_SHA="$GIT_SHA" \
SITU_BUILD_DATE="$BUILD_DATE" \
SITU_BUILD_RELEASE_REPO="${SITU_RELEASE_REPO:-scott-goodfire/situ}" \
  bun build \
    --compile \
    --env=SITU_BUILD_* \
    ${BUN_TARGET_ARGS[@]+"${BUN_TARGET_ARGS[@]}"} \
    --outfile "$STAGE_DIR/bin/situ" \
    projects/app/src/cli.ts

chmod +x "$STAGE_DIR/bin/situ"

cat > "$STAGE_DIR/MANIFEST" <<MANIFEST
situ-version: ${VERSION_TAG}
situ-platform: ${PLATFORM}
situ-target: ${TARGET}
situ-git-sha: ${GIT_SHA}
situ-build-date: ${BUILD_DATE}
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
