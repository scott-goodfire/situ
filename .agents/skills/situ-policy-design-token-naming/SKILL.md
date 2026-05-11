---
name: situ-policy-design-token-naming
description: Use whenever adding, modifying, or reviewing CSS design tokens under projects/web/packages/design-tokens — new color, type, spacing, or motion variables.
---

# Design Token Naming

CSS variables in `packages/design-tokens/src/styles.css` follow a
kebab-case taxonomy and ship paired light + dark values.

## Rules

- All tokens are CSS custom properties under `:root` in
  `packages/design-tokens/src/styles.css`.
- Naming: kebab-case, semantic prefix
  (`--background`, `--foreground`, `--primary`, `--card-hex`,
  `--text-product-base`, `--radius-sm`, `--duration-fast`).
- Number suffixes use hyphens, not dots: `--card-01-hex`,
  `--border-02-5`, `--fg-07-5`.
- Token kinds (use the existing prefixes):
  - `--background` / `--foreground` / `--card-*` / `--surface-*` — surfaces
  - `--primary` / `--accent` / `--muted-*` — semantic colors
  - `--success-*` / `--danger-*` / `--warning-*` — feedback colors
  - `--badge-*` — badge color pairs (bg + text)
  - `--text-product-*` / `--text-content-*` — type sizes
  - `--radius-*` — border radii
  - `--duration-*` / `--ease-*` — motion
  - `--font-sans` / `--font-mono` — font stacks
- Dark-mode overrides live under `:root[data-theme="dark"]` in the same
  file, redefining only the tokens that change.
- Composite tokens use `color-mix(in srgb, ...)` or `color-mix(in oklab, ...)`
  for tinted/transparent variants — don't hand-pick hex values.

## Avoid

- A new token without a `:root` definition.
- A new token without a corresponding dark-mode entry when its value
  must shift.
- camelCase or snake_case token names.
- Hard-coded hex values inside `vars.color.*` consumers — token first,
  then consume.
- Putting design tokens inside a `.css.ts` file instead of `styles.css`.

## See also

- `situ-policy-vanilla-extract-styles`
