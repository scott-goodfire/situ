---
name: situ-policy-configuration-env-vars
description: Use whenever reading, adding, or reviewing process.env.SITU_* environment variables anywhere in projects/app/src — runtime config, install overrides, or debug toggles.
---

# Configuration & Environment Variables

`config/` owns every `process.env.SITU_*` read.

## Why

One place to read env vars means one place to test, one place to set defaults, one place to discover what the app reads. Scattered `process.env.SITU_*` calls break all three: tests can't stub cleanly, two callers drift on defaults, and "what env vars does this app respect?" needs a grep.

## Rules

- Every `SITU_*` accessor lives under `projects/app/src/config/`
  (`localStateHome()`, `sqlitePath()`, `releaseRepo()`, etc.).
- Other modules import the typed accessor; never read `process.env` directly.
- Defaults live inside the accessor:
  `process.env.SITU_X?.trim() || "fallback"` belongs in `config/`, not the call site.
- Accessors are pure: read once, return. No caching that depends on import order.
- New env vars start with the accessor — define it first, then call it.
- Tests may stub via `process.env.SITU_*` and reset in `afterEach`.

## Avoid

- `process.env.SITU_*` outside `config/` (or `*.test.ts`).
- Two accessors reading the same variable with different defaults.
- A new accessor wrapping `process.env` from a consumer module.

## Dev-only toggles

A small set of `SITU_*` env vars are intentionally undocumented in the public
docs site (`projects/docs/`) and hidden from the default `situ --help` output.
They exist for contributor / operator workflows, not end users. New toggles in
this category should follow the same pattern.

- `SITU_DEV` — when truthy (`1` / `true` / `yes`), `printHelp()` in
  `projects/app/src/cli.ts` reveals the full command and flag surface
  (currently `situ skills sync`, the `situ self update` alias, and the internal
  `self-update` flags `--repo`, `--install-home`, `--bin-dir`, `--tarball`,
  plus `compute add`'s `--id` and `--metadata-json`). Read via
  `devModeEnabled()` from `config/runtime.ts`.
- `SITU_DISABLE_SCHEDULER` — skip starting the runtime scheduler in
  `situ app`. Read via `schedulerDisabled()` from `config/runtime.ts`.

When adding new commands or flags that are not user-facing, hide them from the
default help output by gating on `devModeEnabled()`, and hide them from the
public docs by adding the command kind to `hiddenFromDocs` in
`projects/app/src/cli/docs-checks.ts`.

## See also

- `situ-policy-filesystem-access`
- `situ-policy-distribution-install`
