---
title: Frontend Collections And Selectors
status: active
---

# Policy: Frontend Collections And Selectors

## Applies To

The shared collection package under `shared/typescript/collections/**`, web and
TUI live-state code that consumes collections, frontend selectors under
`projects/web/src/selectors/**`, project workspace data shapes, and collection
bootstrap/upsert handling.

## Rule

Frontend live state flows from the local app's collection APIs into TanStack
collections, then through selector functions into UI components. Components
should render already-derived product data instead of owning cross-collection
joins.

The browser is an attach-only client over collection state. It must not read the
canonical SQLite product database directly for research records.

## Required Checks

- New collection-backed record types are added to `SituCollections`,
  `createSituCollections`, bootstrap hydration, and collection-upsert handling
  in `@situ/collections`.
- Collection names and record types come from `@situ/protocol`; do not create
  frontend-only duplicates for durable records.
- Web and TUI clients hydrate from `collections.bootstrap` and update from
  collection upsert notifications or the same app-backed event stream.
- Read-side data derivation lives under `projects/web/src/selectors/<entity>/`
  when it filters, sorts, groups, joins, or summarizes collection records.
- Selector folders export their public surface through `index.ts`. Use
  `query.ts` for entity filters and derivations, `relationships.ts` for joins,
  and `types.ts` when a selector owns a reusable output shape.
- Feature pages import selectors from `@/selectors/<entity>` or a sibling
  selector package surface, not from another feature's internals.
- Use object-style arguments for selectors once they take more than a trivial
  single value, for example `experimentsForHypothesis({ data, hypothesisId })`.
- Prefer `lodash` for non-trivial filtering, sorting, grouping, and collection
  helpers.
- Local web server discovery APIs may list projects, sessions, app health, and
  attach metadata. They should not expose a separate browser-side read path for
  durable research state.
- Selector changes include colocated TypeScript tests when the derivation is
  non-trivial or guards an important product interpretation.

## Red Flags

- UI components repeatedly joining arrays of tasks, hypotheses, experiments,
  evaluations, activities, and links inline in render code.
- Selectors living inside `features/<feature>/selectors.ts` when they operate
  on shared collection state.
- Browser code opening SQLite or using `better-sqlite3` for project research
  records.
- Web and TUI maintaining different local shapes for the same protocol record.
- A new backend collection that is missing from `@situ/collections` or the
  live project session hook.
- A selector returning ambiguous data because it ignores the active project
  scope.
- Collection IDs built inconsistently between bootstrap and upsert paths.

## Review Questions

- Does this state come from the app collection API, not direct storage?
- Is the derivation reusable enough to belong in `src/selectors/`?
- Could another UI surface consume the same selector output?
- Is project scope explicit and consistent?
