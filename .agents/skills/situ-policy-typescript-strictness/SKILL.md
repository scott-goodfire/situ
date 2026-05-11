---
name: situ-policy-typescript-strictness
description: Use whenever adding `any`, non-null assertions, type casts, type imports, or any code that touches TypeScript strictness — also when reviewing oxlint TS rule violations or relaxing the .oxlintrc.json config.
---

# TypeScript Strictness

A small set of oxlint rules in `.oxlintrc.json` enforce strictness
beyond what `tsc --strict` catches. The codebase passes all of them at
`error` severity today; new code is expected to keep that state.

## Why

`tsc --strict` catches a lot, but it lets through `any`, non-null
assertions, redundant casts, mixed type-import styles, import cycles,
and a few quieter footguns. A linter rule per category surfaces these
at write time instead of letting them slip into review. We use oxlint
(already wired) so the cost is one config edit per rule.

## Enabled rules

| Rule                                       | What it bans                                                                                    |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `typescript/no-explicit-any`               | `: any`, `as any`. Forces a real type or `unknown`.                                             |
| `typescript/no-non-null-assertion`         | `value!`. Use a narrowing guard or type the source tighter.                                     |
| `typescript/no-unnecessary-type-assertion` | `value as T` when the assertion is redundant given the inferred type.                           |
| `typescript/no-empty-object-type`          | `{}` as a type — matches `null` and `undefined`. Use `Record<string, unknown>` or a real shape. |
| `typescript/no-wrapper-object-types`       | `Number`, `String`, `Boolean` as types. Use the lowercase primitives.                           |
| `typescript/consistent-type-imports`       | Mixes of `import type { X }` and inline-`type` imports. Picks one style per file.               |
| `typescript/no-import-type-side-effects`   | `import type` shouldn't have side effects.                                                      |
| `typescript/prefer-as-const`               | `as 5` when `as const` does it cleaner.                                                         |
| `typescript/prefer-function-type`          | `interface F { (): void }` instead of `type F = () => void`.                                    |
| `import/no-cycle`                          | Circular imports across modules.                                                                |

Test files exempt: `typescript/no-explicit-any` is `off` for
`**/*.test.ts`, `**/*.test.tsx`, and `projects/e2e-tests/**` since
test scaffolding sometimes needs untyped fixtures.

## Rules

- All ten TS rules above stay at `error`. New code that triggers any of
  them gets fixed, not silenced.
- New `as` casts require justification — the `no-unnecessary-type-assertion`
  rule already strips redundant ones, so any remaining cast must
  legitimately reshape a type. Add a brief comment if the _why_ isn't
  obvious.
- Non-null narrowing uses guards, not `!`:

  ```ts
  // Avoid
  spawn(cmd[0]!, cmd.slice(1));

  // Prefer
  const [head, ...tail] = cmd; // typed as [string, ...string[]] at the source
  spawn(head, tail);
  ```

- `unknown` is the right default when a value's shape isn't yet known.
  Validate at the boundary with zod (e.g., `z.object({ ... }).parse(value)`
  or `jsonModule.record({ value })` from `modules/json` for the flexible
  `Record<string, unknown>` case), not by casting to `any`.
- `import type { X } from "..."` for type-only imports; `import { x }`
  for runtime imports. Mixing in a single statement is banned.

## Why not type-coverage

We considered the `type-coverage` package (a single
`% identifiers without any` gate). At our scale and with these oxlint
rules at `error`, the per-violation flag is more actionable than a
quantitative number — and `type-coverage` is in slow maintenance mode
(last release ~mid-2025) while oxlint type-aware rules are the active
direction.

## Avoid

- Demoting any of the ten rules to `warn` or `off` to land a PR.
  Either fix the violation or carry a one-PR `// oxlint-disable-next-line`
  with a written reason.
- `as unknown as T` chains — the second cast defeats the rule. Reshape
  the input type instead.
- Adding a per-file `/* eslint-disable */` style escape hatch — oxlint
  has scoped disables, use them sparingly with a reason.
- Silencing `import/no-cycle` instead of inverting the dependency.

## See also

- `situ-policy-type-naming-suffixes`
- `situ-policy-error-throwing`
- `situ-policy-barrel-exports`
- `situ-policy-find-require-pair`
