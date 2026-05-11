---
name: situ-policy-file-naming
description: Use whenever adding, renaming, or reviewing files and folders under projects/app/src.
---

# File Naming

Everything is kebab-case.

## Rules

- TS / TSX file names: `kebab-case.ts`, `kebab-case.tsx`,
  `kebab-case.test.ts`.
- Folder names: kebab-case.
- Reserved local-batch helper folder: `__shared__`. Use it only at the
  nearest common parent when sibling files or sibling folders share private
  implementation helpers.
- Multi-word entities keep the hyphen: `compute-targets`, `entity-links`.
  Don't collapse.
- File names match the dominant export's noun, not the verb:
  `hypothesis-repository.ts` exports `hypothesisRepository`;
  `compute-command.ts` exports `runComputeCommand`.
- The barrel file is always `index.ts`. No `mod.ts`, `main.ts`, `barrel.ts`.

## Avoid

- camelCase or PascalCase file names — even when the dominant export is
  a class or component.
- Folder names with underscores, except the reserved `__shared__` helper
  folder.
- `_shared`, `shared__`, `__helpers__`, or other underscore variants. If the
  helper folder is intentionally local-batch-only, use exactly `__shared__`.
- Two files in the same folder differing only by case
  (`Foo.ts` and `foo.ts`).

## See also

- `situ-policy-test-file-placement`
