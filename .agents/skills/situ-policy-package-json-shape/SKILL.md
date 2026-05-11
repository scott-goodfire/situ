---
name: situ-policy-package-json-shape
description: Use whenever adding, modifying, or reviewing a package.json — root workspace, project workspace, or publishable web package.
---

# package.json Shape

The root `package.json` is the workspace and dependency-catalog hub.
Each workspace package is small, declarative, and references the
catalog instead of re-pinning versions.

## Root `package.json`

```json
{
  "name": "situ-workspace",
  "private": true,
  "type": "module",
  "packageManager": "bun@1.2.20",
  "workspaces": {
    "packages": ["projects/app", "projects/e2e-tests", "projects/web", "projects/web/packages/*"],
    "catalog": { "react": "^19.2.6", "lodash-es": "^4.17.21", "...": "..." }
  },
  "scripts": { "check": "mise run check", "...": "mise run *" },
  "devDependencies": { "...": "..." }
}
```

## Rules — root

- `private: true`, `type: "module"`, `packageManager: "bun@<version>"`.
- `workspaces.packages` lists every project + every web package.
- Shared cross-workspace versions live in `workspaces.catalog`. Add
  a new shared dependency by adding it to the catalog first.
- `scripts.*` are thin wrappers around `mise run <task>`. Keep tool
  invocations in `mise.toml`, not in package.json.

## Rules — every workspace package

- `name: "@situ/<kebab-name>"`. Reuse existing package names; don't
  invent new prefixes.
- `version: "0.0.1"`, `private: true`, `type: "module"`.
- Library packages export their entrypoint via:

  ```json
  "exports": { ".": "./src/index.ts" }
  ```

- Workspace dependencies use `"@situ/protocol": "workspace:*"` —
  never a literal version.
- Catalog dependencies use `"@types/bun": "catalog:"` — never a
  literal version once the catalog has the entry.
- Every package has a `check` script:
  `"check": "tsgo --noEmit -p tsconfig.json"`.
- Test scripts: `"test": "vitest run"` (or `bun test`-shaped scripts
  for backend test suites that vitest can't drive yet).
- Storybook scripts (when the package has stories):
  `"storybook": "storybook dev -p <port> --host 127.0.0.1"`.

## Avoid

- A workspace package without `private: true` (we don't publish to npm).
- Re-pinning a version that already exists in the catalog.
- A `dependencies` entry pointing at a published version of a sibling
  workspace package — use `workspace:*`.
- Inline tool invocations under `scripts` (`bun x oxlint`, `tsc -p .`)
  instead of going through `mise run` from the root.
- A new shared dependency added to a single workspace's
  `dependencies` instead of the root catalog.

## See also

- `situ-policy-workspace-package-shape`
- `situ-policy-tsconfig-shape`
- `situ-policy-ci-workflow-shape`
