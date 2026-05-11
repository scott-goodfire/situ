# Web Testing — React + Replicache

How we test React hooks and components on the web side. Focused on the
two patterns that recur: (1) hooks with derivation logic, and (2) hooks
that subscribe to Replicache.

## Stack

| Tool                        | Role                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `vitest`                    | Test runner. Two configs: root `vitest.config.ts` (CI sweep) and `projects/web/packages/app-ui/vitest.config.ts` (standalone). |
| `happy-dom`                 | DOM environment. Faster than jsdom, sufficient for our use. Set in both vitest configs.                                        |
| `@testing-library/react`    | `renderHook`, `render`, `act`, `waitFor`. The renderHook + wrapper pattern is how we provide context to hooks.                 |
| `@testing-library/jest-dom` | DOM-assertion matchers (`toBeInTheDocument`, etc.). Loaded once via `projects/web/test-setup.ts`.                              |

`projects/web/test-setup.ts` is referenced by both vitest configs. It
imports the jest-dom matchers and runs `cleanup()` after every test.

## Replicache strategy

Replicache supports an in-memory store (`kvStore: "mem"`) and no longer
requires a license key. The official guidance
([doc.replicache.dev/howto/unit-test](https://doc.replicache.dev/howto/unit-test))
is to construct **real** Replicache instances per test, not to mock the
library. We follow that.

Two helpers live at `projects/web/src/test-utils/replicache.tsx`:

- `createTestReplicache()` — returns a fresh `Replicache` with
  `kvStore: "mem"`, `pullURL`/`pushURL` undefined, a randomized `name`,
  and a built-in `seedTestData` mutator for writing fixtures.
- `seedReplicache(rep, entries)` — writes a key→value map into the
  test rep so subsequent subscriptions can see it.
- `<ReplicacheTestProvider rep={rep}>` — wraps with the same
  `ReplicacheContext` the production provider uses, so hooks calling
  `useReplicache()` resolve correctly.

A typical hook test:

```tsx
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import {
  ReplicacheTestProvider,
  createTestReplicache,
  seedReplicache,
  type TestReplicache,
} from "../../test-utils/replicache";
import { useEntityListWhere } from "./use-entity-list-where";

let rep: TestReplicache;

afterEach(async () => {
  await rep?.close();
});

type Row = { id: string; status: "open" | "closed" };

test("useEntityListWhere returns only matching rows", async () => {
  rep = createTestReplicache();
  await seedReplicache(rep, {
    "rows/a": { id: "a", status: "open" },
    "rows/b": { id: "b", status: "closed" },
    "rows/c": { id: "c", status: "open" },
  });

  const { result } = renderHook(
    () => useEntityListWhere<Row>("rows/", (row) => row.status === "open"),
    {
      wrapper: ({ children }) => (
        <ReplicacheTestProvider rep={rep}>{children}</ReplicacheTestProvider>
      ),
    },
  );

  await waitFor(() => {
    expect(result.current).toHaveLength(2);
  });
});
```

Key points:

- Always `await rep?.close()` in `afterEach` — Replicache holds open
  resources.
- The first render returns the `default` value (e.g. `[]`) before the
  async query resolves. Use `waitFor` to wait for the real value.
- Tests share no state because each `createTestReplicache()` call
  generates a new randomized `name`.

## Components that use @tanstack/react-router

Anything rendering a `<Link>`, `<Outlet>`, or calling `useNavigate()`
needs a `RouterProvider` in scope. Use `renderInRouter` from
`projects/web/src/test-utils/router.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";

import { renderInRouter } from "../../test-utils/router";
import { BackLink } from "./back-link";

test("renders a link to the given path", async () => {
  render(renderInRouter(<BackLink to="/tasks" label="All tasks" />));
  const link = await waitFor(() => screen.getByRole("link", { name: /all tasks/i }));
  expect(link).toHaveAttribute("href", "/tasks");
});
```

The helper wraps the component in a `createMemoryHistory` router with
the component as the root route — no real route tree needed. The
`<Link to="/foo">` renders as a regular `<a href="/foo">` you can
assert on.

Components using vanilla-extract CSS (`*.css.ts`) require the
`vanillaExtractPlugin` in `vitest.config.ts`. It's wired at the root
already; if you split out a new vitest config, copy that plugin entry.

## What to test, and what not to

**Test these.** Hooks and components with logic the type system can't
catch:

- Hooks that **derive** — filter, sort, group, join, branch
  (`useEntityListWhere`, or a ResearchProject hook that adds real
  filtering beyond a plain collection read).
- Hooks that are **stateful** — `useState` + `useEffect` with side
  effects (`useLocalStorage`, anything subscribing to window events).
- Hooks that **compose** multiple sources where the composition could
  break independently of either source.
- Components with **branching render paths** that have caused bugs.

**Skip these.** Tests that just re-state the type signature:

- Thin wrappers like
  `useResearchTasks() => useEntityList<ResearchTaskRecord>("researchTasks/")`.
  The test would assert "rows under researchTasks/ come back as
  ResearchTaskRecord[]" — which is exactly what `useEntityList` already
  guarantees, and what the production code already exercises end-to-end.
- Hooks of the shape `useFoo() => useEntity<FooRecord>("foos/", id)`.
  Same reason.

If a thin wrapper _does_ grow logic later (a sort, a filter, a
fallback), it graduates into the "test these" bucket at that moment —
not preemptively.

## Where tests live

- Hook tests sit next to the hook: `use-foo.ts` ↔ `use-foo.test.tsx`.
- Component tests sit next to the component: `foo.tsx` ↔
  `foo.test.tsx`.
- Shared utilities under `projects/web/packages/{ui,app-ui}/src` test
  the same way using their package's `vitest.config.ts`.

## Running

```bash
bun x vitest run                          # full sweep (root config)
bun x vitest                              # watch mode
bun --filter=@situ/web-app-ui test        # standalone app-ui tests
mise run coverage:web                     # coverage report (informational)
```

## See also

- [Replicache unit-test docs](https://doc.replicache.dev/howto/unit-test)
- `situ-policy-react-hook-testing` — when a hook deserves a test
- `.agents/docs/meta-layer/DOC.md` — where this fits in the broader stack
