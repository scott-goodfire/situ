#!/usr/bin/env bash
# Curl-shell installer for Situ.
#
# Public repo:
#   curl -fsSL https://raw.githubusercontent.com/<repo>/main/config/scripts/install.sh | bash
#   curl -fsSL ... | bash -s -- v0.1.0          # pin a version
#
# Private repo (uses gh auth):
#   gh api -H "Accept: application/vnd.github.raw" repos/<repo>/contents/config/scripts/install.sh | bash
#   gh api -H "Accept: application/vnd.github.raw" repos/<repo>/contents/config/scripts/install.sh | bash -s -- v0.1.0
#
# Environment overrides:
#   SITU_VERSION         pin a release tag (default: latest, or take from $1)
#   SITU_RELEASE_REPO    GitHub <org>/<repo>
#   SITU_INSTALL_HOME    install dir (default: $HOME/.local/share/situ)
#   SITU_BIN_DIR         PATH-symlink dir (default: $HOME/.local/bin)
#   SITU_RELEASE_TARBALL absolute path to a local tarball (skips GitHub download).
#                        Requires SITU_VERSION.
#   GH_TOKEN, GITHUB_TOKEN
#                        bearer token for GitHub. Falls back to `gh auth token`
#                        when present. Required for private repos.
#
# See .agents/specs/0017-distribution-and-install/SPEC.md for the contract.

set -euo pipefail

REPO="${SITU_RELEASE_REPO:-scott-goodfire/autoresearch-harness}"
VERSION="${SITU_VERSION:-${1:-latest}}"
INSTALL_HOME="${SITU_INSTALL_HOME:-$HOME/.local/share/situ}"
BIN_DIR="${SITU_BIN_DIR:-$HOME/.local/bin}"

err() { printf 'error: %s\n' "$*" >&2; exit 1; }
info() { printf '==> %s\n' "$*"; }

resolve_gh_token() {
  if [ -n "${GH_TOKEN:-}" ]; then
    printf '%s' "$GH_TOKEN"
    return
  fi
  if [ -n "${GITHUB_TOKEN:-}" ]; then
    printf '%s' "$GITHUB_TOKEN"
    return
  fi
  if command -v gh >/dev/null 2>&1; then
    gh auth token 2>/dev/null || true
  fi
}

GH_AUTH_TOKEN="$(resolve_gh_token)"

api_curl() {
  if [ -n "$GH_AUTH_TOKEN" ]; then
    curl -fsSL \
      -H "Authorization: Bearer $GH_AUTH_TOKEN" \
      -H "Accept: application/vnd.github+json" \
      "$@"
  else
    curl -fsSL "$@"
  fi
}

download_asset() {
  local url="$1"
  local outfile="$2"
  if [ -n "$GH_AUTH_TOKEN" ]; then
    curl -fsSL \
      -H "Authorization: Bearer $GH_AUTH_TOKEN" \
      -H "Accept: application/octet-stream" \
      "$url" -o "$outfile"
  else
    curl -fsSL "$url" -o "$outfile"
  fi
}

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

extract_asset_url() {
  local release_json="$1"
  local asset_name="$2"
  printf '%s' "$release_json" \
    | tr -d '\r\n' \
    | sed -n "s/.*\"url\":\"\\([^\"]*\\/releases\\/assets\\/[0-9][0-9]*\\)\"[^{}]*\"name\":\"$asset_name\".*/\\1/p" \
    | head -n 1
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

if [ -n "${SITU_RELEASE_TARBALL:-}" ] && [ "$VERSION" = "latest" ]; then
  err "SITU_RELEASE_TARBALL requires SITU_VERSION to be set explicitly"
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if [ -n "${SITU_RELEASE_TARBALL:-}" ]; then
  [ -f "$SITU_RELEASE_TARBALL" ] || err "SITU_RELEASE_TARBALL not found: $SITU_RELEASE_TARBALL"
  TAG="$VERSION"
  case "$TAG" in v*) ;; *) TAG="v$TAG" ;; esac
  TARBALL_NAME="situ-${TAG}-${PLATFORM}.tar.gz"
  info "using local tarball: $SITU_RELEASE_TARBALL"
  cp "$SITU_RELEASE_TARBALL" "$TMP_DIR/$TARBALL_NAME"
  printf '%s  %s\n' "$(sha256_of "$TMP_DIR/$TARBALL_NAME")" "$TARBALL_NAME" > "$TMP_DIR/checksums.txt"
else
  if [ "$VERSION" = "latest" ]; then
    info "resolving latest release tag"
    release_json="$(api_curl "https://api.github.com/repos/${REPO}/releases/latest")" \
      || err "failed to query latest release for $REPO"
  else
    TAG="$VERSION"
    case "$TAG" in v*) ;; *) TAG="v$TAG" ;; esac
    info "resolving release $TAG"
    release_json="$(api_curl "https://api.github.com/repos/${REPO}/releases/tags/${TAG}")" \
      || err "failed to query release $TAG for $REPO"
  fi

  TAG="$(printf '%s' "$release_json" | tr -d '\r\n' | sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)"
  [ -n "$TAG" ] || err "could not resolve release tag from $REPO"
  info "installing $TAG"

  TARBALL_NAME="situ-${TAG}-${PLATFORM}.tar.gz"

  if [ -n "$GH_AUTH_TOKEN" ]; then
    tarball_url="$(extract_asset_url "$release_json" "$TARBALL_NAME")"
    checksums_url="$(extract_asset_url "$release_json" "checksums.txt")"
    [ -n "$tarball_url" ] || err "release $TAG has no asset named $TARBALL_NAME"
    [ -n "$checksums_url" ] || err "release $TAG has no checksums.txt asset"
  else
    release_base="https://github.com/${REPO}/releases/download/${TAG}"
    tarball_url="${release_base}/${TARBALL_NAME}"
    checksums_url="${release_base}/checksums.txt"
  fi

  info "downloading $TARBALL_NAME"
  download_asset "$tarball_url" "$TMP_DIR/$TARBALL_NAME" \
    || err "failed to download $TARBALL_NAME"

  info "downloading checksums.txt"
  download_asset "$checksums_url" "$TMP_DIR/checksums.txt" \
    || err "failed to download checksums.txt"
fi

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
