---
name: situ-policy-page-adapter-shape
description: Use whenever adding, modifying, or reviewing a page under projects/web/src/pages — list pages, detail pages, or any route-component-to-view adapter.
---

# Page Adapter Shape

Pages in `web/src/pages/` are thin adapters: call selectors, pass results
into a `@situ/web-app-ui` view. No JSX layout, no presentation logic.

```ts
// pages/hypotheses-list-page/hypotheses-list-page.tsx
import { HypothesesListView } from "@situ/web-app-ui";
import { useHypotheses } from "../../hooks/hypotheses";

export function HypothesesListPage() {
  return <HypothesesListView hypotheses={useHypotheses()} />;
}
```

## Why

The split keeps presentation testable in Storybook (the view) and routing
testable in TanStack (the route). Pages are the only place that knows
"this route needs this selector" — keeping them tiny means the seam is
easy to read.

## Rules

- Folder: `web/src/pages/<entity>s-list-page/` (list) or
  `web/src/pages/<entity>-detail-page/` (detail).
- Files: `<page-name>.tsx` + `index.ts` barrel.
- The page component is one or two lines of body: call the selector, pass
  to the view.
- List pages: `<EntityListView entities={useEntities()} />`.
- Detail pages: `<EntityDetailView entity={useEntity(id)} activities={...} />`,
  taking `id` as a prop from the route.
- Imports come from `@situ/web-app-ui` (views) and `../../hooks/`
  (data). No imports from `@situ/web-ui` directly.

## Avoid

- A page that adds JSX wrappers, headers, or layout — that belongs in
  the view.
- A page that contains conditional logic about the data shape — fix the
  view or the selector.
- Importing UI primitives (`DxBadge`, etc.) into a page.
- Two pages sharing a wrapper — promote the wrapper to a view in
  `@situ/web-app-ui`.

## See also

- `situ-policy-tanstack-route-shape`
- `situ-policy-hook-shape`
- `situ-policy-list-view-shape`
- `situ-policy-detail-view-shape`
