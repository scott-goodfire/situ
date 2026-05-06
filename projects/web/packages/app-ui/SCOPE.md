# `@situ/web-app-ui` — scope

This package is the **Situ-branded design exploration surface for Storybook**.
It is _not_ consumed by the live web app at `projects/web/src/`.

## What lives here

- `src/shell/situ-shell.tsx` — branded `DxAppFrame` wrapper with the Situ
  sidebar and top bar. The reference shell — the live app's
  `src/app/app-shell.tsx` is structurally similar but uses TanStack-Router
  links instead of click callbacks.
- `src/pages/<page>/<page>-view.tsx` — Situ-branded page views (overview,
  hypotheses, experiments, evaluations, agents, events, project-index,
  run-monitor, no-active-harness). Stories drive these.
- `src/styles.css.ts` — shared view styles (page header, view stack,
  cell utilities, mono helpers, sidebar, run-monitor field rows).

## Why it's separate from the live app

The live app's pages live in `projects/web/src/features/project-workspace/`
because they need TanStack Router links, the live `useLiveProjectSession`
hook, and project workspace context. The app-ui page views are simpler —
they take props and render. That difference makes app-ui a clean Storybook
surface for design iteration without dragging the routing/data plumbing
into the loop.

The two trees do drift in places (the live app added `Analyses` and `Tasks`
pages that app-ui doesn't have yet). That's fine: app-ui is a design source,
not a contract.

## How to use it

- Run Storybook: `bun run storybook` (port 6007).
- When iterating on visual design for an existing page, change the app-ui
  view first; verify in Storybook; port the change to the live page.
- New pages can land directly in the live app without an app-ui counterpart
  if there's no design uncertainty.

## What is _not_ in scope

- Routing — the live app owns this. App-ui story routers are local fakes.
- Data fetching — views take props.
- Mutations — neither tree mutates today (per
  `0003-live-observability` policy: web monitor is read-only by design).

## Where this is codified

- `0012-module-organization` "Frontend layout" section describes the live
  app's tree.
- `0003-live-observability` describes the read-only constraint.
- This file is the in-package scope marker for `@situ/web-app-ui`.
