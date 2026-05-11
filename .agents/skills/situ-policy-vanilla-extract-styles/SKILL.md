---
name: situ-policy-vanilla-extract-styles
description: Use whenever writing, modifying, or reviewing *.css.ts files — Dx primitives, app-ui pages, the runtime app, or any vanilla-extract style module.
---

# Vanilla Extract Styles

`*.css.ts` files use `style()` from `@vanilla-extract/css` and read tokens
from `vars`. No inline styles in components.

```ts
import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const button = style({
  padding: "0 8px",
  borderRadius: vars.radius.sm,
  fontSize: vars.text.productBase,
  transition: `background-color ${vars.duration.fast} ${vars.ease.out}`,
});
```

## Rules

- File name: `<sibling>.css.ts` next to the `<sibling>.tsx` it styles.
- Import `style` (and `globalStyle`, `keyframes`, etc. as needed) from
  `@vanilla-extract/css`. Import `vars` from the package's `theme.css`.
- Each style is a named export. Variants and sizes get their own export
  (`button`, `primary`, `secondary`, `small`).
- All design tokens come from `vars.color.*`, `vars.radius.*`,
  `vars.font.*`, `vars.text.*`, `vars.duration.*`, `vars.ease.*`,
  `vars.tracking.*`. Never hard-code colors or token values.
- Pseudo-states use the object form (`:hover`, `:focus-visible`,
  `:disabled`); attribute states use `selectors: { "&[data-disabled]":
... }`.
- Consumers import as `import * as s from "./<sibling>.css"` and access
  via `s.button`.

## Avoid

- `style={{ color: "red" }}` inline in a component.
- Hard-coded colors, font sizes, radii, or durations — go through `vars`.
- A single `style()` block holding all variants — split into named
  exports per variant.
- Importing styles from another component's `.css.ts` — share via
  `theme.css` or a shared style module instead.

## See also

- `situ-policy-dx-component-shape`
- `situ-policy-design-token-naming`
