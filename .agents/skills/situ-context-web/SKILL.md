---
name: situ-context-web
description: Use when learning or changing Situ's web app, TanStack routes, Replicache hooks, app-ui views, fixtures, Storybook, or UI tests.
---

# Situ Context Web

## Goal

Learn the current web flow from source, stories, and tests. Trace route
to page adapter to hook to synced key to app-ui view using concepts, not
fixed filenames.

## What To Look For

Locate app entry and routing:

- router provider and route tree
- route definitions
- redirects
- app shell
- sidebar/navigation groups
- layout outlet
- settings gate
- research workspace gate

Locate synced data:

- Replicache provider
- pull/push URLs
- poke/subscription behavior
- generic entity hooks
- feature hooks
- key prefixes
- backend Replicache patch output
- local settings

Locate setup and workspace UI:

- research project setup route/page/view
- goal submission action
- user question and baseline confirmation actions
- workspace route/page/view
- task tree display
- verification display
- evidence/report/diagnostics surfaces

Locate app-ui boundaries:

- protocol records
- app-ui domain records
- page adapter transformations
- fixtures
- stories
- component tests
- hook tests
- vanilla-extract styles

Locate proof:

- web type/build checks
- app-ui type/tests
- route or router tests
- Replicache hook tests
- Storybook stories
- Playwright/e2e coverage if present
- missing stories/tests for visible surfaces

## What To Learn

Build a file-backed answer to:

- Which route renders the feature?
- Is the behavior route protection, redirect behavior, or sidebar/nav
  visibility?
- Which page adapter gathers data and actions?
- Which hooks and synced key prefixes feed the page?
- Which backend sync output creates those keys?
- Which app-ui component owns the visible UI?
- Which fixtures, stories, and tests cover the UI?
- Which expected stories/tests are missing?

## Investigation Pattern

For a UI feature:

1. Locate route, redirect, and app shell behavior by route concepts.
2. Follow to page adapters and data hooks by feature nouns.
3. Match hook key prefixes to backend sync output.
4. Follow app-ui props, fixtures, stories, and tests.
5. Report missing visual or hook coverage instead of assuming it exists.

Load web policies when editing, reviewing, or validating route shape,
page adapters, hooks, Storybook stories, React tests, or styles.

## Verification

Use checks that match the change:

- web typecheck for route/page/hook changes
- web build for router/build integration
- app-ui typecheck for view/fixture changes
- app-ui tests for component or fixture behavior
- Storybook or screenshot workflow for visual changes

## Reporting

Report route/redirect behavior, page adapter, hook/key prefix, backend
sync source, view component, fixtures/stories/tests, and unknowns.
