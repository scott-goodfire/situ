# @situ/web-app-ui

`@situ/web-app-ui` owns Situ-branded browser views composed from `@situ/web-ui`
primitives. The live web app consumes these views and supplies routing, live
data, selectors, and runtime wiring.

This package should stay fixture-renderable:

- no TanStack Router imports
- no React Query imports
- no live session hooks
- no collection clients
- no local server or SQLite code

Stories in this package use local fixtures so UI-heavy page work can happen
without a running Situ harness.
