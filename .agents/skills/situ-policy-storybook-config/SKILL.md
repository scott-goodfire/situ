---
name: situ-policy-storybook-config
description: Use whenever adding, modifying, or reviewing a Storybook configuration — .storybook/main.ts or .storybook/preview.tsx in any web package.
---

# Storybook Config

Each Storybook-publishing package has the same `.storybook/main.ts` plus
a `preview.tsx` that wraps every story in `DxThemeProvider` with a
shared theme toolbar.

```text
packages/<pkg>/.storybook/
├── main.ts        # framework + addons + viteFinal
└── preview.tsx    # theme decorator + globals
```

## Why

Two packages publish Storybooks (`@situ/web-ui`, `@situ/web-app-ui`).
Their `main.ts` files are byte-for-byte identical because the build
prerequisites (vanilla-extract plugin, react dedupe) are the same.
Their `preview.tsx` files are nearly identical because every story
must render against the design tokens with a working theme toggle.
Drift here breaks visual review.

## Rules

- File names: `main.ts` and `preview.tsx` (TSX, not TS — preview
  defines a JSX decorator).
- `main.ts` is `StorybookConfig` from `@storybook/react-vite`.
- `stories` glob: `["../src/**/*.stories.@(ts|tsx)"]`.
- `addons`: `["@storybook/addon-mcp"]` (catalog entry exists; don't
  pin a different version per package).
- `framework`: `{ name: "@storybook/react-vite", options: {} }`.
- `typescript: { reactDocgen: false }` — keeps Vite startup fast.
- `viteFinal` adds the vanilla-extract plugin and dedupes
  `react`, `react-dom`, `react/jsx-runtime`. New packages copy this
  block verbatim.
- `preview.tsx` imports `@situ/web-design-tokens/styles.css` and the
  package's `foundation.css` so every story gets the tokens.
- `preview.tsx` wraps every story in `DxThemeProvider` via a
  `Decorator`, with a `theme` global toolbar that exposes
  `light` / `dark` / `auto`.
- `preview` parameters: `layout: "fullscreen"`, the standard control
  matchers for color and date detection.
- Storybook ports: `6006` for `@situ/web-ui`, `6007` for
  `@situ/web-app-ui`. Don't reassign without a reason.

## Avoid

- A package's `main.ts` diverging from the canonical block (different
  addons, missing `vanillaExtractPlugin`, custom dedupe).
- `reactDocgen: true` — it slows Vite startup with no payoff for our
  story style.
- A `preview.tsx` that omits `DxThemeProvider` — stories will render
  against the wrong tokens.
- A new Storybook port outside the 6006/6007 pair without updating the
  package.json scripts and the README.

## See also

- `situ-policy-storybook-stories`
- `situ-policy-vanilla-extract-styles`
- `situ-policy-workspace-package-shape`
