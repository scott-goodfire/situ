---
name: situ-policy-detail-view-shape
description: Use whenever adding, modifying, or reviewing a detail view under projects/web/packages/app-ui/src/pages — new entity detail compositions, missing-record states, or activity timelines.
---

# Detail View Shape

Each entity has a `<entity>-detail-view/` folder that composes
`ObjectHeader` + `DxSection`s + `ActivityTimeline`, with explicit
missing-record handling.

```text
packages/app-ui/src/pages/<entity>-detail-view/
├── <entity>-detail-view.tsx
├── <entity>-detail-view.stories.tsx
└── index.ts
```

## Why

Detail views handle the case where a record doesn't exist
(navigation by stale URL, deletion mid-session). A detail view that
renders `undefined.title` is a runtime error; an explicit
`<DxEmptyState>` is the contract.

## Rules

- Folder name: `<entity>-detail-view/` (singular). Component:
  `<Entity>DetailView`.
- Component takes a prop bag where the entity field is `| undefined`:
  `{ hypothesis: HypothesisRecord | undefined; activities?: ActivityRecord[] }`.
- First check: `if (!entity) { return <DxEmptyState heading="..." description="..." />; }`.
- Composition order: `<ObjectHeader>` (eyebrow + title + status badge +
  summary) → one or more `<DxSection>`s → `<ActivityTimeline>`.
- Status badge tone comes from `researchStatusTone({ status })` or the
  entity-specific tone helper.
- Optional `back` prop typed as `ReactNode` is rendered in the header.
- All UI imports come from `@situ/web-ui`. Records import from
  `../../domain/records`.
- `index.ts` is a one-line re-export.

## Avoid

- A detail view without a missing-record branch — `undefined` will crash.
- Open-coding header / status / time markup instead of
  `ObjectHeader` / `DxBadge` / `DxTime`.
- Fetching data inside the view — pages are responsible (see
  `situ-policy-page-adapter-shape`).
- Inlined activity timeline markup — use `ActivityTimeline`.

## See also

- `situ-policy-list-view-shape`
- `situ-policy-page-adapter-shape`
- `situ-policy-storybook-stories`
