---
status: accepted
implementation_status: partially_implemented
created: 2026-05-12
---

# 0010. Build Installable Local CLI Release Artifacts

## Context

Situ is a local app. A useful local app should be installable without requiring
the user to keep a source checkout, understand the workspace layout, or run
development commands.

Classic Situ built per-platform release tarballs containing a compiled CLI,
assets, checksums, and an installer. That remains the right shape.

## Decision

Situ will produce installable CLI release artifacts.

The release shape is:

- per-platform tarballs under `dist/release`
- compiled `bin/situ` CLI binary
- bundled web assets needed by the local app
- bundled runtime agent assets needed by the CLI
- `MANIFEST` with version, platform, git SHA, build date, and tarball name
- `checksums.txt`
- installer script in `config/scripts/install.sh`

`config/scripts/build_release_assets.sh` builds release assets. `mise run
release:build` invokes it. Release scripts use `SITU_*` environment variables
for target, version, release repository, install home, binary directory, and
local tarball overrides.

Release workflows smoke-test the installed artifact, not only the source tree.

## Consequences

The installed binary must not depend on source-relative assets.

Installer and self-update behavior should use a versioned install layout with a
stable `current` symlink and a launcher in the configured binary directory.

Release tests should run `situ --version`, `situ doctor`, and any lightweight
self-update or asset-resolution checks that prove the tarball is usable.

## Related

- ADR 0008: Keep Repository Scripts Thin And Boring
- ADR 0009: Use GitHub For Review, CI, And Release Coordination
- ADR 0011: Use Mechanical Quality Gates For Code And Meta Docs
