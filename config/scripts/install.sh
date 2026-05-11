#!/usr/bin/env bash
# Curl-shell installer for Situ.
#
# Public repo:
#   curl -fsSL https://raw.githubusercontent.com/<repo>/main/config/scripts/install.sh | bash
#   curl -fsSL ... | bash -s -- v0.1.0
#
# Private repo:
#   gh api -H "Accept: application/vnd.github.raw" repos/<repo>/contents/config/scripts/install.sh | bash
#   gh api -H "Accept: application/vnd.github.raw" repos/<repo>/contents/config/scripts/install.sh | bash -s -- v0.1.0

set -euo pipefail

REPO="${SITU_RELEASE_REPO:-scott-goodfire/situ}"
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
    Linux) os="linux" ;;
    *) err "unsupported OS: $(uname -s)" ;;
  esac
  case "$(uname -m)" in
    arm64|aarch64) arch="arm64" ;;
    x86_64|amd64) arch="x64" ;;
    *) err "unsupported arch: $(uname -m)" ;;
  esac
  printf '%s-%s' "$os" "$arch"
}

sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

resolve_latest_tag() {
  if command -v gh >/dev/null 2>&1; then
    local tag
    tag="$(gh release view --repo "$REPO" --json tagName --jq .tagName 2>/dev/null || true)"
    if [ -n "$tag" ]; then
      printf '%s' "$tag"
      return
    fi
  fi

  local effective
  effective="$(curl -fsSLI -o /dev/null -w '%{url_effective}' \
    "https://github.com/${REPO}/releases/latest")" \
    || err "failed to resolve latest release for $REPO"
  basename "$effective"
}

download_release_assets() {
  local tag="$1"
  local tarball_name="$2"
  if command -v gh >/dev/null 2>&1; then
    if gh release download "$tag" \
      --repo "$REPO" \
      --pattern "$tarball_name" \
      --pattern checksums.txt \
      --dir "$TMP_DIR" \
      --clobber >/dev/null 2>&1; then
      return
    fi
  fi

  local release_base="https://github.com/${REPO}/releases/download/${tag}"
  info "downloading $tarball_name"
  download_asset "${release_base}/${tarball_name}" "$TMP_DIR/$tarball_name" \
    || err "failed to download $tarball_name"

  info "downloading checksums.txt"
  download_asset "${release_base}/checksums.txt" "$TMP_DIR/checksums.txt" \
    || err "failed to download checksums.txt"
}

PLATFORM="$(detect_platform)"
info "detected platform: $PLATFORM"

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
    info "resolving latest release"
    TAG="$(resolve_latest_tag)"
  else
    TAG="$VERSION"
    case "$TAG" in v*) ;; *) TAG="v$TAG" ;; esac
  fi
  info "installing $TAG"

  TARBALL_NAME="situ-${TAG}-${PLATFORM}.tar.gz"
  download_release_assets "$TAG" "$TARBALL_NAME"
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
