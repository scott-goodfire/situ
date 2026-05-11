---
name: situ-verify-local-distribution
description: Use when testing or verifying the local Situ distributable, release tarball, installer, installed binary, or GitHub release packaging workflow before publishing.
---

# Situ Verify Local Distribution

## Purpose

Use this skill to verify that the Bun-compiled Situ distributable works without
the source checkout at runtime. The check should exercise the release tarball,
installer, installed binary, static web assets, HTTP API, and app startup.

Do not use the user's normal `~/.situ` state for smoke tests. Run with an
isolated `SITU_HOME` under `dist/`.

## Fast Path

Run the bundled smoke script from the repo root:

```bash
.agents/skills/situ-verify-local-distribution/scripts/local-release-smoke.sh
```

This script:

- rebuilds `dist/release/situ-<tag>-<platform>.tar.gz`
- installs it into `dist/local-release-smoke/install`
- uses `dist/local-release-smoke/state` as `SITU_HOME`
- checks `situ --version`
- checks `situ self-update` against the freshly built local tarball
- checks `situ doctor --json`
- starts `situ app --port 0`
- verifies `/`, `/app.js`, `/tokens.css`, `/styles.css`, `/api/bootstrap`, and `/api/status`
- shuts the app server down

## Manual Workflow

Use this when debugging one step at a time.

```bash
rm -rf dist/release dist/local-release-smoke
./config/scripts/build_release_assets.sh
```

Install the host-platform tarball into an isolated directory. Adjust the
platform suffix if not on Apple Silicon:

```bash
SITU_VERSION=v0.0.1 \
SITU_RELEASE_TARBALL="$PWD/dist/release/situ-v0.0.1-darwin-arm64.tar.gz" \
SITU_INSTALL_HOME="$PWD/dist/local-release-smoke/install" \
SITU_BIN_DIR="$PWD/dist/local-release-smoke/bin" \
./config/scripts/install.sh
```

Verify metadata and diagnostics:

```bash
SITU_HOME="$PWD/dist/local-release-smoke/state" \
  dist/local-release-smoke/bin/situ --version

SITU_VERSION=v0.0.1 \
SITU_RELEASE_TARBALL="$PWD/dist/release/situ-v0.0.1-darwin-arm64.tar.gz" \
SITU_INSTALL_HOME="$PWD/dist/local-release-smoke/install" \
SITU_BIN_DIR="$PWD/dist/local-release-smoke/bin" \
SITU_HOME="$PWD/dist/local-release-smoke/state" \
  dist/local-release-smoke/bin/situ self-update

SITU_HOME="$PWD/dist/local-release-smoke/state" \
  dist/local-release-smoke/bin/situ doctor --json
```

Start and probe the installed app:

```bash
SITU_HOME="$PWD/dist/local-release-smoke/state" \
  dist/local-release-smoke/bin/situ app --port 0
```

In another shell, fetch the printed URL:

```bash
curl -fsS "$URL/"
curl -fsS "$URL/app.js"
curl -fsS "$URL/tokens.css"
curl -fsS "$URL/styles.css"
curl -fsS "$URL/api/bootstrap"
curl -fsS "$URL/api/status"
```

## Expected Results

- The tarball contains `bin/situ`, `share/web/index.html`,
  `share/web/app.js`, `share/web/styles.css`, `share/web/tokens.css`,
  `share/skills/situ-*-runtime/SKILL.md`, and `MANIFEST`.
- `situ --version` prints the release tag and short git SHA for compiled
  release builds.
- `situ self-update` can reinstall the release tarball into the same isolated
  install home and preserve the `current` and launcher symlinks.
- `situ doctor --json` reports `"healthy": true`.
- `doctor` reports `"webAssets.mode": "installed"` for the installed binary.
- The app starts from the installed binary without `bun`, `node_modules`, or
  source-relative web files.
- The HTTP checks return status `200`.
- In isolated state, `anthropicKeyConfigured` may be `false`; that is expected
  unless the smoke explicitly seeds a key.

## Before Finishing

Run the deterministic checks too:

```bash
mise run check
bash -n config/scripts/build_release_assets.sh config/scripts/install.sh
```

Report the exact commands run, whether the installed app was started, and any
non-default `SITU_HOME`, `SITU_INSTALL_HOME`, or `SITU_BIN_DIR` paths used.
