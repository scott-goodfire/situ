#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$REPO_ROOT"

VERSION_INPUT="${SITU_VERSION:-$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' projects/app/package.json | head -n 1)}"
VERSION_TAG="v${VERSION_INPUT#v}"

detect_platform() {
  local os arch
  case "$(uname -s)" in
    Darwin) os="darwin" ;;
    Linux) os="linux" ;;
    *) echo "unsupported OS: $(uname -s)" >&2; exit 1 ;;
  esac
  case "$(uname -m)" in
    arm64|aarch64) arch="arm64" ;;
    x86_64|amd64) arch="x64" ;;
    *) echo "unsupported arch: $(uname -m)" >&2; exit 1 ;;
  esac
  printf '%s-%s' "$os" "$arch"
}

PLATFORM="$(detect_platform)"
SMOKE_DIR="$REPO_ROOT/dist/local-release-smoke"
INSTALL_HOME="$SMOKE_DIR/install"
BIN_DIR="$SMOKE_DIR/bin"
STATE_HOME="$SMOKE_DIR/state"
TARBALL="$REPO_ROOT/dist/release/situ-${VERSION_TAG}-${PLATFORM}.tar.gz"
LOG_FILE="$(mktemp)"
APP_PID=""

cleanup() {
  if [ -n "$APP_PID" ]; then
    kill "$APP_PID" 2>/dev/null || true
    wait "$APP_PID" 2>/dev/null || true
  fi
  rm -f "$LOG_FILE" /tmp/situ-root.html /tmp/situ-app.js /tmp/situ-tokens.css /tmp/situ-styles.css
}
trap cleanup EXIT

echo "==> cleaning smoke output"
rm -rf "$REPO_ROOT/dist/release" "$SMOKE_DIR"
mkdir -p "$SMOKE_DIR"

echo "==> building release tarball"
SITU_VERSION="$VERSION_TAG" ./config/scripts/build_release_assets.sh

echo "==> inspecting tarball"
tar -tzf "$TARBALL" | sort | grep -E '^\./(MANIFEST|bin/situ|share/web/(app\.js|index\.html|styles\.css|tokens\.css))$' >/dev/null
for role in manager scientist verifier; do
  tar -tzf "$TARBALL" | sort | grep -E "^\./share/skills/situ-${role}-runtime/SKILL\.md$" >/dev/null
done

echo "==> installing release tarball"
SITU_VERSION="$VERSION_TAG" \
SITU_RELEASE_TARBALL="$TARBALL" \
SITU_INSTALL_HOME="$INSTALL_HOME" \
SITU_BIN_DIR="$BIN_DIR" \
  ./config/scripts/install.sh

echo "==> checking installed binary"
SITU_HOME="$STATE_HOME" "$BIN_DIR/situ" --version

echo "==> checking self-update from local tarball"
SITU_VERSION="$VERSION_TAG" \
SITU_RELEASE_TARBALL="$TARBALL" \
SITU_INSTALL_HOME="$INSTALL_HOME" \
SITU_BIN_DIR="$BIN_DIR" \
SITU_HOME="$STATE_HOME" \
  "$BIN_DIR/situ" self-update

SITU_HOME="$STATE_HOME" "$BIN_DIR/situ" doctor --json | tee "$SMOKE_DIR/doctor.json"
grep -q '"healthy": true' "$SMOKE_DIR/doctor.json"
grep -q '"mode": "installed"' "$SMOKE_DIR/doctor.json"

echo "==> starting installed app"
SITU_HOME="$STATE_HOME" "$BIN_DIR/situ" app --port 0 >"$LOG_FILE" 2>&1 &
APP_PID=$!

URL=""
for _ in $(seq 1 40); do
  if grep -q 'Situ running at' "$LOG_FILE"; then
    URL="$(sed -n 's/^Situ running at //p' "$LOG_FILE" | tail -n 1)"
    break
  fi
  if ! kill -0 "$APP_PID" 2>/dev/null; then
    cat "$LOG_FILE"
    exit 1
  fi
  sleep 0.25
done

if [ -z "$URL" ]; then
  cat "$LOG_FILE"
  echo "server did not print URL" >&2
  exit 1
fi

echo "==> probing $URL"
curl -fsS -o /tmp/situ-root.html "${URL}"
curl -fsS -o /tmp/situ-app.js "${URL}app.js"
curl -fsS -o /tmp/situ-tokens.css "${URL}tokens.css"
curl -fsS -o /tmp/situ-styles.css "${URL}styles.css"
curl -fsS "${URL}api/bootstrap" | tee "$SMOKE_DIR/bootstrap.json" >/dev/null
curl -fsS "${URL}api/status" | tee "$SMOKE_DIR/status.json" >/dev/null

grep -q '<title>Situ</title>' /tmp/situ-root.html
grep -q 'Replicache' /tmp/situ-app.js
grep -q -- '--background' /tmp/situ-tokens.css
grep -q 'theme-toggle' /tmp/situ-styles.css
grep -q '"sessionId"' "$SMOKE_DIR/bootstrap.json"
grep -q '"anthropicKeyConfigured"' "$SMOKE_DIR/status.json"

echo "==> release smoke passed"
cat "$LOG_FILE"
