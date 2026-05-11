---
name: situ-policy-dx-component-shape
description: Use whenever adding, modifying, or reviewing a Dx-prefixed UI primitive under projects/web/packages/ui/src/components.
---

# Dx Component Shape

Each Dx primitive lives in `packages/ui/src/components/dx-<name>/` with a
fixed four-file layout.

```text
packages/ui/src/components/dx-<name>/
├── dx-<name>.tsx         # the component
├── dx-<name>.css.ts      # vanilla-extract styles
├── dx-<name>.stories.tsx # Storybook stories
└── index.ts              # re-export
```

## Rules

- Folder name is the kebab-case `dx-<name>`. The `dx-` prefix is required.
- The four files match the folder name exactly: `dx-<name>.tsx`,
  `dx-<name>.css.ts`, `dx-<name>.stories.tsx`, `index.ts`.
- Component file exports a single `Dx<PascalName>` component plus its
  `Dx<PascalName>Props` type.
- `index.ts` is a one-line barrel:
  `export { DxButton, type DxButtonProps } from "./dx-button";`.
- Styles import from `./dx-<name>.css` as `import * as s`.
- Cross-component imports go through `@situ/web-ui` (the package barrel),
  never through deep paths.
- Private implementation helpers shared by sibling components live under
  `packages/ui/src/components/__shared__/`. Do not re-export them from the
  package barrel.

## Exceptions

- Hook-only or theme-only modules may omit `.css.ts` and `.stories.tsx`
  (e.g., `dx-theme-provider`, `use-dx-theme`).

## Avoid

- Adding a primitive without the `dx-` prefix.
- Splitting one component's styles or stories across multiple files.
- A component file that exports more than one component (split into
  separate folders instead).

## See also

- `situ-policy-dx-component-props`
- `situ-policy-vanilla-extract-styles`
- `situ-policy-storybook-stories`
