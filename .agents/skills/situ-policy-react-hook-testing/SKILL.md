---
name: situ-policy-react-hook-testing
description: Use whenever adding, modifying, or reviewing a React hook or component test under projects/web — deciding whether one is needed, where it lives, and how to construct a test Replicache.
---

# React Hook Testing

Hooks and components on the web side use vitest + happy-dom + React
Testing Library. Replicache-backed hooks construct a real in-memory
Replicache instance per test (no mocks) — see
[`.agents/docs/web-testing/DOC.md`](../../docs/web-testing/DOC.md) for
the full pattern.

## Rules

- A hook or component gets a test when it has logic the type system
  can't catch:
  - **Derivation** — filter, sort, group, join, branch
    (`useEntityListWhere`, or a ResearchProject hook that adds real
    filtering beyond a plain collection read).
  - **Local state** — `useState` / `useEffect` / `useReducer` with
    side effects (`useLocalStorage`, window-event subscriptions).
  - **Composition** — combines multiple data sources where the
    composition could break independently of either source.
  - **Branching render paths** in components, especially ones that
    have caused a bug.
- Tests live next to source: `use-foo.ts` ↔ `use-foo.test.tsx`.
  Components: `foo.tsx` ↔ `foo.test.tsx`. No `__tests__/` folders.
- Replicache hook tests use `createTestReplicache()` and
  `<ReplicacheTestProvider>` from
  `projects/web/src/test-utils/replicache.tsx`. Always
  `await rep?.close()` in `afterEach`.
- Subscriptions resolve asynchronously — the first render returns the
  default value. Use `waitFor` from `@testing-library/react` to await
  the real value.
- DOM-interacting tests (anything calling `renderHook` or `render`)
  rely on `happy-dom` + the shared `projects/web/test-setup.ts` for
  jest-dom matchers and `cleanup()`. Don't import either directly in
  individual test files.

## Avoid

- Backfilling tests for thin wrappers like
  `useResearchTasks() => useEntityList<ResearchTaskRecord>("researchTasks/")`.
  The test would re-state the type signature; the production code
  already exercises the shape end-to-end.
- Mocking `Replicache`, `useSubscribe`, or `useReplicache`. The
  in-memory rep is fast, accurate, and supported by upstream.
- Tests that depend on real network endpoints. `pullURL` and `pushURL`
  must be `undefined` in test rep construction (the helper does this).
- Reusing one `Replicache` instance across tests — each test should
  build a fresh one with a randomized name so they can't see each
  other's writes.

## See also

- `.agents/docs/testing/DOC.md` — testing principles across all stacks
- `situ-policy-hook-shape` — what shape hooks should take
- `situ-policy-test-file-placement` — placement rules for tests
- `.agents/docs/web-testing/DOC.md` — full strategy + worked examples
