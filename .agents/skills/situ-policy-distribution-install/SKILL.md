---
name: situ-policy-distribution-install
description: Use whenever modifying, reviewing, or testing release packaging, install scripts, self-update, or doctor — anything in config/scripts, .github/workflows/situ-release.yml, or src/cli/self-update-command.ts.
---

# Distribution & Install

Release artifacts run without the source checkout.

## Rules

- Tarballs include `bin/situ`, web assets (`share/web`), runtime skills (`share/skills`), and `MANIFEST`.
- `install.sh` verifies the tarball checksum before extracting.
- `situ self-update` preserves the versioned layout
  (`<install>/versions/<tag>` plus the `current` symlink) and updates the
  `<bin>/situ` launcher.
- `situ doctor --json` is healthy on an isolated installed binary.
- Release smoke (`.github/workflows/situ-release.yml`) isolates `SITU_HOME`, `SITU_INSTALL_HOME`, and `SITU_BIN_DIR` to `runner.temp`.

## Avoid

- An installed binary resolves source-relative assets
  (`new URL("../../dist/...", import.meta.url)`).
- Installer or self-update writes runtime data into the install dir.
- Release smoke uses the runner's normal `~/.situ`.

## See also

- `situ-policy-runtime-skills`
- `situ-policy-configuration-env-vars`
