---
name: situ-policy-tanstack-route-shape
description: Use whenever adding, modifying, or reviewing a route under projects/web/src/routes — new entity routes, dynamic params, or root layout changes.
---

# TanStack Route Shape

Route files in `web/src/routes/` are thin: they declare the route and
delegate to a page component. No JSX, no business logic, no data fetching.

```ts
// routes/hypotheses/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { HypothesesListPage } from "../../pages/hypotheses-list-page";

export const Route = createFileRoute("/hypotheses/")({
  component: HypothesesListPage,
});
```

```ts
// routes/hypotheses/$hypothesisId.tsx — dynamic param
export const Route = createFileRoute("/hypotheses/$hypothesisId")({
  component: function HypothesisDetailRoute() {
    const { hypothesisId } = Route.useParams();
    return <HypothesisDetailPage id={hypothesisId} />;
  },
});
```

## Rules

- File name and path match TanStack's file-routing convention:
  `routes/hypotheses/index.tsx` ↔ `/hypotheses/`,
  `routes/hypotheses/$hypothesisId.tsx` ↔ `/hypotheses/$hypothesisId`.
- Each file exports `Route = createFileRoute(path)({ component, ... })`.
- The `component` is a one-line reference to a page component imported
  from `../../pages/<area>/`. Pure delegation.
- Dynamic params get an inline component that destructures
  `Route.useParams()` and forwards typed props to the page.
- Routes don't read selectors, fetch data, or render JSX beyond the page
  component.
- `__root.tsx` defines the app-shell layout; everything else hangs off
  it.

## Avoid

- Inline JSX (other than the param-forwarding wrapper) inside a route file.
- Selector hooks called inside a route file — page components own that.
- Routes importing UI primitives directly — they import page components,
  which import primitives.
- Manual `path` strings that don't match the file name.

## See also

- `situ-policy-page-adapter-shape`
- `situ-policy-hook-shape`
