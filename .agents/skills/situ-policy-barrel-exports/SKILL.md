---
name: situ-policy-barrel-exports
description: Use whenever organizing imports, adding modules to a folder, or reviewing the public surface of a module-shaped folder.
---

# Barrel Exports

Module-shaped folders expose a stable public surface via `index.ts`.
Prefer that public surface whenever it exists.

## Rules

- Module folders with 3+ files expose an `index.ts` that names every public export. No `export *`.
- Cross-folder imports use the barrel: `from "../repositories/experiments"`, not `"../repositories/experiments/experiment-repository"`.
- Tests, stories, fixtures, evals, and examples import the module's public API through the barrel when the symbol is exported there.
- Same-folder public-surface checks can import from `.` in tests or examples: `from "."`, not `from "./registry"`.
- Type re-exports use `export type { ... }`.
- Folder-private helpers can live in their own files and export from that file for direct sibling imports. Do not add them to `index.ts` unless cross-folder callers should depend on them.
- Local-batch helpers shared by sibling files or sibling folders live under a
  `__shared__/` folder at the nearest common parent. Prefer an `index.ts`
  barrel when it has multiple public helper symbols. The nearest package or
  parent barrel may promote selected `__shared__` symbols when they are part of
  that surface.
- Same-folder implementation imports between sibling modules are direct when the barrel would create a cycle or hide a private helper (`./repository-utils`).

## Folders covered today

`repositories/<entity>/`, `repositories/__shared__/`, `claude/agents/roles/`, `claude/agents/tools/`, `claude/agents/skills/`, `runtime/*/`, `cli/`, `http/`, `spa/`, `web/`, and package folders that already expose an `index.ts`.

## Exceptions

- Technical-utility folders (`db/`, `config/`) keep deep imports — their submodules are distinct concerns and a single barrel would re-export 30+ symbols or hide which technical layer is in use.
- Leaf implementation modules may deep-import sibling files in the same folder when importing through `.` would route back through an `index.ts` that also exports the leaf.
- Private helpers that are intentionally absent from the barrel can be deep-imported by nearby implementation modules. If a distant caller needs that helper, first decide whether the helper belongs in the public barrel.
- `__shared__/` imports are allowed for siblings under the same parent. If a
  caller outside that parent needs the helper, promote it to the nearest
  appropriate public module instead of reaching into `__shared__`.
- Narrow entry probes may deep-import when the barrel would load unrelated runtime modules or side effects. Keep these rare and local to evals, generated code, and build scripts.

## Avoid

- A module-shaped folder lacks `index.ts` and callers reach in.
- `index.ts` uses `export *` — re-exports private helpers.
- A barrel imports from another barrel which imports from a third — collapse the chain.
- A parent `index.ts` uses `export *` from `__shared__/` and accidentally
  exposes private helpers. Re-export selected symbols by name when they are part
  of the parent surface.

## See also

- `situ-policy-repository-module-shape`
- `situ-policy-cli-command-shape`
