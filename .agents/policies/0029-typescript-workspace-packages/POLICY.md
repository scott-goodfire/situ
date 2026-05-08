---
title: TypeScript Workspace Packages
status: active
---

# Policy: TypeScript Workspace Packages

## Applies To

TypeScript `package.json` and `tsconfig.json` files under `projects/**` and
`shared/typescript/**`, root `package.json`, `bun.lock`, package exports,
cross-package imports, and TypeScript package dependency changes.

## Rule

TypeScript packages are private Bun workspace packages with explicit layer
boundaries. Shared packages expose reusable contracts and clients. Product apps
compose those packages. Reusable UI packages expose public entrypoints through
package exports.

Import through package names and exports, not deep relative paths across package
roots.

## Required Checks

- Workspace packages use scoped names such as `@situ/protocol`,
  `@situ/rpc-client`, `@situ/collections`, `@situ/web-ui`, `@situ/web-app-ui`,
  `@situ/tui-ui`, `@situ/web`, and `@situ/tui`.
- TypeScript packages are private and ESM-shaped with `"private": true` and
  `"type": "module"`.
- Reusable packages define explicit `exports`; application packages may keep
  app entrypoints internal.
- Package-to-package dependencies use `workspace:*` for local Situ packages.
- `tsconfig.json` files extend the root `tsconfig.base.json` unless a package
  has a documented reason not to.
- Package scripts include `check` when the package contains TypeScript source;
  packages with colocated tests include `test`.
- Cross-package imports go through package names, for example
  `@situ/protocol` or `@situ/rpc-client/http`, rather than `../../../shared`.
- Browser packages do not import Node-only modules except in server-only files
  such as the local web server.
- UI libraries keep `react` and `react-dom` as peer dependencies when they are
  reusable by an app package.
- Dependency and package changes update `bun.lock` when needed.
- Generated or build output such as `dist/`, `storybook-static/`, and
  `node_modules/` is not treated as source package structure.

## Red Flags

- Deep relative imports across package roots.
- A reusable package with source files but no package export.
- Duplicate protocol or RPC client types in an app package.
- A package-specific TypeScript config drifting from root strictness without a
  clear reason.
- A browser-rendered module importing `node:fs`, `node:path`, `better-sqlite3`,
  or process-only APIs.
- `react` bundled as a normal dependency in a reusable UI package when it
  should be a peer dependency.
- Local package dependency versions pinned to normal semver instead of
  `workspace:*`.
- Package scripts becoming the only place command behavior exists instead of
  delegating durable repo commands through `commands/` and `mise.toml`.

## Review Questions

- Does this package expose only the public surface other packages should use?
- Is the dependency direction consistent with the product layer?
- Can the root check command discover and typecheck this package?
- Would moving the package folder break consumers because they import private
  files?
