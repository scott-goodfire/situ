---
title: UI Package Boundaries
status: active
---

# Policy: UI Package Boundaries

## Applies To

Web UI packages under `projects/web/packages/**`, TUI UI package code under
`projects/tui/packages/ui/**`, Storybook configuration, design tokens,
fixture-driven stories, reusable components, and app-specific UI composition.

## Rule

UI package layers should stay narrow:

- `@situ/web-design-tokens` owns design variables.
- `@situ/web-ui` owns reusable browser UI primitives.
- `@situ/web-app-ui` owns Situ-branded browser views composed from primitives.
- `@situ/web` owns routing, live data, local web server code, and app
  integration.
- `@situ/tui-ui` owns fixture-renderable terminal UI components and stories.
- `@situ/tui` owns live terminal app wiring.

Reusable UI packages receive data through props. App packages own live RPC,
collection hydration, routing, and process/server concerns.

## Required Checks

- Design-token packages do not import React, protocol records, app code,
  collection clients, or RPC clients.
- Reusable UI primitive packages do not import app routes, local web server
  code, workspace discovery clients, or harness/runtime code.
- App-specific UI packages may use protocol types and Situ product language,
  but should still avoid owning live RPC or collection subscriptions.
- App packages compose UI packages and own live data fetching, routing, server
  startup, and session attachment behavior.
- Reusable React UI packages keep React as a peer dependency.
- CSS and vanilla-extract styles stay close to the component or package layer
  that owns the visual decision.
- Storybook stories use local fixtures and do not require a live Situ app,
  harness runtime, SQLite database, model key, or workspace.
- TUI stories and snapshots render from fixture data in `@situ/tui-ui`, not
  from live app state.
- Package exports expose stable public UI surfaces; consumers should not import
  private component files from another package.
- Components should not present controls that imply mutation when the current
  web surface is attach-only/read-only.

## Red Flags

- Design tokens importing product records, React components, or runtime clients.
- A primitive UI component opening RPC clients, reading app state, or knowing
  about a session lifecycle.
- Storybook stories that require `situ app`, a real workspace, or model
  credentials.
- App routing or server code leaking into `@situ/web-ui` or `@situ/web-app-ui`.
- TUI fixture UI depending on the live harness or app process.
- Deep imports across UI packages instead of package exports.
- A reusable UI package writing generated snapshots, Storybook output, or build
  artifacts into source directories by default.

## Review Questions

- Is this visual code in the lowest package layer that can own it?
- Does the package dependency direction preserve reusable UI boundaries?
- Can the component render in Storybook or a fixture snapshot without live app
  state?
- Does read-only monitor UI avoid implying unsupported mutations?
