---
name: situ-policy-dx-component-props
description: Use whenever defining, modifying, or reviewing the props of a Dx UI primitive — variants, sizes, className handling, or base-component wrapping.
---

# Dx Component Props

Dx primitives share a prop-shape recipe: omit `className` from the wrapped
base, layer Dx options on top, accept `className` back as optional.

```ts
type BaseButtonProps = ComponentPropsWithoutRef<typeof BaseButton>;

export type DxButtonProps = Omit<BaseButtonProps, "className"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "small" | "medium";
  className?: string;
};
```

## Why

Caller-supplied `className` is composed last via `classNames` so it always
wins. If we let the base-component pass through its own `className`, the
caller's className either gets clobbered or stomps the variant styles
unpredictably. Variant/size enums make the call site readable; arbitrary
`style` props don't.

## Rules

- Wrap a base library type with `Omit<BaseProps, "className">`, then
  re-add `className?: string` on the Dx props.
- Variants and sizes are string-literal unions
  (`variant?: "primary" | "secondary" | ...`), not booleans.
- Map variants to styles via a `const VARIANT_CLASS = { ... } as const;`
  lookup, not a switch.
- Compose final className with `classNames({ values: [...] })` from
  `../../class-names`. Never use string concatenation or template
  literals.
- Provide defaults at destructure
  (`{ variant = "secondary", size = "medium", ... }`).

## Avoid

- `style` or `css` props on Dx components — use variants and sizes.
- Booleans like `primary={true}` — use `variant="primary"`.
- A switch statement for variant→class lookup.
- Forwarding the base component's `className` directly.

## See also

- `situ-policy-dx-component-shape`
- `situ-policy-vanilla-extract-styles`
