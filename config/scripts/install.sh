#!/usr/bin/env bash
# Curl-shell installer for Situ.
#
#   curl -fsSL https://raw.githubusercontent.com/<repo>/main/config/scripts/install.sh | sh
#
# Environment overrides:
#   SITU_VERSION         pin a release tag (default: latest)
#   SITU_RELEASE_REPO    GitHub <org>/<repo> (default: scott-goodfire/autoresearch-harness)
#   SITU_INSTALL_HOME    install dir (default: $HOME/.local/share/situ)
#   SITU_BIN_DIR         PATH-symlink dir (default: $HOME/.local/bin)
#
# See .agents/specs/0017-distribution-and-install/SPEC.md for the contract.

set -euo pipefail

REPO="${SITU_RELEASE_REPO:-scott-goodfire/autoresearch-harness}"
VERSION="${SITU_VERSION:-latest}"
INSTALL_HOME="${SITU_INSTALL_HOME:-$HOME/.local/share/situ}"
BIN_DIR="${SITU_BIN_DIR:-$HOME/.local/bin}"

err() { printf 'error: %s\n' "$*" >&2; exit 1; }
info() { printf '==> %s\n' "$*"; }

detect_platform() {
  local os arch
  case "$(uname -s)" in
    Darwin) os="darwin" ;;
    Linux)  os="linux" ;;
    *) err "unsupported OS: $(uname -s)" ;;
  esac
  case "$(uname -m)" in
    arm64|aarch64) arch="arm64" ;;
    x86_64|amd64)  arch="x64" ;;
    *) err "unsupported arch: $(uname -m)" ;;
  esac
  printf '%s-%s' "$os" "$arch"
}

resolve_python() {
  for candidate in python3.13 python3 python; do
    if command -v "$candidate" >/dev/null 2>&1; then
      if "$candidate" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 13) else 1)' 2>/dev/null; then
        printf '%s' "$candidate"
        return 0
      fi
    fi
  done
  return 1
}

resolve_latest_tag() {
  local response
  response="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest")" || \
    err "failed to query latest release for $REPO"
  printf '%s' "$response" | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -n1
}

sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

PLATFORM="$(detect_platform)"
info "detected platform: $PLATFORM"

PYTHON_BIN="$(resolve_python || true)"
if [ -z "${PYTHON_BIN:-}" ]; then
  err "Python 3.13+ is required but was not found on PATH. Install it from https://www.python.org/downloads/ and rerun."
fi
info "using $PYTHON_BIN ($($PYTHON_BIN --version 2>&1))"

if [ "$VERSION" = "latest" ]; then
  VERSION="$(resolve_latest_tag)"
  [ -n "$VERSION" ] || err "could not resolve latest release tag for $REPO"
fi
TAG="$VERSION"
case "$TAG" in
  v*) ;;
  *) TAG="v$TAG" ;;
esac
info "installing $TAG"

TARBALL_NAME="situ-${TAG}-${PLATFORM}.tar.gz"
RELEASE_BASE="https://github.com/${REPO}/releases/download/${TAG}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

info "downloading $TARBALL_NAME"
curl -fsSL "${RELEASE_BASE}/${TARBALL_NAME}" -o "$TMP_DIR/$TARBALL_NAME" || \
  err "failed to download $TARBALL_NAME from $RELEASE_BASE"

info "downloading checksums.txt"
curl -fsSL "${RELEASE_BASE}/checksums.txt" -o "$TMP_DIR/checksums.txt" || \
  err "failed to download checksums.txt from $RELEASE_BASE"

EXPECTED="$(awk -v name="$TARBALL_NAME" '$2 == name || $2 == "*"name {print $1}' "$TMP_DIR/checksums.txt")"
[ -n "$EXPECTED" ] || err "checksum for $TARBALL_NAME missing from checksums.txt"

ACTUAL="$(sha256_of "$TMP_DIR/$TARBALL_NAME")"
if [ "$EXPECTED" != "$ACTUAL" ]; then
  err "checksum mismatch for $TARBALL_NAME (expected $EXPECTED, got $ACTUAL)"
fi
info "checksum verified"

VERSION_DIR="${INSTALL_HOME}/versions/${TAG}"
info "extracting to $VERSION_DIR"
rm -rf "$VERSION_DIR"
mkdir -p "$VERSION_DIR"
tar -xzf "$TMP_DIR/$TARBALL_NAME" -C "$VERSION_DIR"

info "creating Python venv"
"$PYTHON_BIN" -m venv "$VERSION_DIR/venv"
"$VERSION_DIR/venv/bin/python" -m pip install --quiet --upgrade pip

info "installing wheels (this may take a minute)"
# shellcheck disable=SC2046
"$VERSION_DIR/venv/bin/python" -m pip install --quiet $(ls "$VERSION_DIR/wheels/"*.whl)

mkdir -p "$VERSION_DIR/bin"
ln -sfn "../venv/bin/situ" "$VERSION_DIR/bin/situ"

mkdir -p "$INSTALL_HOME"
ln -sfn "versions/${TAG}" "$INSTALL_HOME/current"

mkdir -p "$BIN_DIR"
ln -sfn "$INSTALL_HOME/current/bin/situ" "$BIN_DIR/situ"

printf '\nSitu %s installed.\n' "$TAG"
printf '  versioned dir: %s\n' "$VERSION_DIR"
printf '  launcher:      %s\n' "$BIN_DIR/situ"

case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *)
    printf '\nAdd %s to your PATH, e.g.:\n' "$BIN_DIR"
    printf '  echo '\''export PATH="%s:$PATH"'\'' >> ~/.zshrc\n' "$BIN_DIR"
    ;;
esac
