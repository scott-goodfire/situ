---
name: situ-policy-filesystem-access
description: Use whenever reading, writing, or reviewing file IO under projects/app/src — config files, secrets, registries, web assets, or any disk operation.
---

# Filesystem Access

Use `node:fs/promises`. Resolve paths through `config/`.

## Rules

- Read/write IO uses `node:fs/promises` — `readFile`, `writeFile`, `mkdir`,
  `lstat`, `realpath`, `chmod`, `rm`.
- App-state paths under `~/.situ` come from `config/paths.ts` accessors.
  No hand-built `homedir()` joins outside `config/`. Install paths under
  `~/.local/share/situ` are governed by `situ-policy-distribution-install`.
- `mkdir` calls pass `{ recursive: true }` for state directories, then
  `chmod 0o700` for any directory holding secrets.
- Missing optional files: catch `ENOENT` and return `null` / a default.
  Don't pre-check with `stat`.

## Exceptions

- Cheap path checks (`existsSync`, `realpathSync`) and bootstrap
  `mkdirSync` may import from `node:fs` when async would only complicate
  startup. The `node:fs` `constants` import is always fine.
- `Bun.file` is allowed for static asset serving in HTTP handlers
  (`server.ts:webFile`). Bun-specific write APIs (`Bun.write`, `Bun.glob`)
  are reserved for build scripts under `config/scripts/`.

## Avoid

- `readFileSync` / `writeFileSync` in src.
- A `homedir()`-based path outside `config/` for an app-state file.
- A secret-bearing file created without `chmod 0o600`, or its directory
  without `0o700`.
- `Bun.file` / `Bun.write` on app-state files (sessions, secrets, registries).

## See also

- `situ-policy-configuration-env-vars`
- `situ-policy-subprocess-spawning`
