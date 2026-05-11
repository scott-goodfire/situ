---
name: situ-policy-tsconfig-shape
description: Use whenever adding, modifying, or reviewing a tsconfig.json — the base config or any per-workspace override.
---

# tsconfig Shape

A single `tsconfig.base.json` at the repo root carries the strictness
and module settings; every workspace extends it with the minimum
overrides needed for its build.

## Base — `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## Per-workspace `tsconfig.json`

```json
{
  "extends": "../../<...>/tsconfig.base.json",
  "compilerOptions": {
    "rootDir": ".",
    "outDir": "dist",
    "types": ["bun"]
  },
  "include": ["src/**/*.ts"]
}
```

## Rules

- Every workspace `tsconfig.json` extends the root `tsconfig.base.json`
  (with the relative path that resolves correctly).
- Per-workspace overrides are minimal: `rootDir`, `outDir`, `include`,
  and only the compilerOptions that genuinely differ (e.g., `jsx`,
  `composite`, `declaration`, `tsBuildInfoFile`, `types`).
- Library packages (anything consumed by another workspace) set
  `composite: true`, `declaration: true`, `outDir: "dist"`,
  `tsBuildInfoFile: "dist/.tsbuildinfo"`.
- TSX-using packages set `jsx: "react-jsx"`.
- Bun-running packages add `"bun"` to `types`. Vite-using packages also
  add `"vite/client"`.
- `include` lists exactly the source roots the workspace builds — `src`,
  plus `.storybook` for packages that ship stories, plus drizzle/build
  config files when relevant.

## Avoid

- Re-declaring `strict`, `target`, `module`, or `moduleResolution` in a
  workspace tsconfig — they belong only in the base.
- A workspace tsconfig without an `extends`.
- An `include` that uses `**/*` from the package root — be explicit
  about source folders.
- A library tsconfig missing `composite` / `declaration` (downstream
  workspaces fail to build).
- A `types` array that pulls in everything (`"types": []` is the default
  if you only need ambient lib types).

## See also

- `situ-policy-workspace-package-shape`
- `situ-policy-package-json-shape`
