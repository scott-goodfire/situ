---
name: situ-policy-workspace-package-shape
description: Use whenever adding, splitting, or reviewing a workspace package — the top-level project workspaces (app, web, e2e-tests) and the publishable packages under projects/web/packages.
---

# Workspace Package Shape

Every Bun workspace package follows the same skeleton. Anything that
isn't on this skeleton needs a recorded reason.

```text
<package-root>/
├── src/                # all source
├── dist/               # build output, gitignored, never edited
├── package.json
├── tsconfig.json
├── vitest.config.ts    # only if the package runs vitest
└── .storybook/         # only if the package publishes a Storybook
```

## Rules

- Source lives under `src/`. No top-level `index.ts` outside `src/`.
- Build output (`dist/`) is in `.gitignore` and never imported from
  another package — consumers import the package by name and let the
  exports field resolve.
- Each package has its own `package.json` and `tsconfig.json`. Both
  follow `situ-policy-package-json-shape` and `situ-policy-tsconfig-shape`.
- Test config (`vitest.config.ts`) sits at the package root only when
  vitest is actually run from that package.
- Storybook config (`.storybook/main.ts` + `.storybook/preview.tsx`)
  sits at the package root only when the package publishes stories.
- Workspaces register in the root `package.json`'s `workspaces.packages`
  array.

## Workspaces today

```text
projects/app                          (@situ/app)
projects/web                          (@situ/web)
projects/e2e-tests                    (@situ/e2e-tests)
projects/web/packages/protocol        (@situ/protocol)
projects/web/packages/ui              (@situ/web-ui)
projects/web/packages/app-ui          (@situ/web-app-ui)
projects/web/packages/design-tokens   (@situ/web-design-tokens)
```

## Avoid

- A package that puts source files at the package root (alongside
  `package.json`) instead of under `src/`.
- A package importing another package's `dist/` directly.
- A `src/` directory without a corresponding `tsconfig.json` `include`
  entry.
- A new workspace not listed under the root `workspaces.packages` array.

## See also

- `situ-policy-package-json-shape`
- `situ-policy-tsconfig-shape`
- `situ-policy-barrel-exports`
