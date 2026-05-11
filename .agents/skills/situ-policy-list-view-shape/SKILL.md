---
name: situ-policy-list-view-shape
description: Use whenever adding, modifying, or reviewing a list view under projects/web/packages/app-ui/src/pages — new entity tables, column changes, or list compositions.
---

# List View Shape

Each entity has a `<entity>s-list-view/` folder that renders a `DxTable`
of typed records inside a `DxSection`.

```text
packages/app-ui/src/pages/<entity>s-list-view/
├── <entity>s-list-view.tsx         # the view
├── <entity>s-list-view.stories.tsx # fixture-driven stories
└── index.ts                        # re-export
```

```ts
export function HypothesesListView({ hypotheses }: { hypotheses: HypothesisRecord[] }) {
  return (
    <DxSection title="Hypotheses">
      <DxTable
        columns={hypothesisColumns}
        rows={hypotheses}
        getRowKey={({ row }) => row.id}
        emptyLabel="No hypotheses yet"
        density="compact"
        stickyHeader
        sortable
      />
    </DxSection>
  );
}
```

## Rules

- Folder name: `<plural-entity>-list-view/`. View component:
  `<PluralEntity>ListView`.
- Component takes a single prop bag with the typed array
  (`{ hypotheses: HypothesisRecord[] }`); `HypothesisRecord` comes from
  `../../domain/records`.
- Composition: `<DxSection title="...">` wraps a single `<DxTable>`.
- Columns are declared as a top-level `const <entity>Columns: Array<DxTableColumn<EntityRecord>> = [...]`
  defined under the component, not inline.
- Each column has `id`, `header`, `width`, `renderCell`, `sortValue`.
- Cell text uses `mono` for ids, `DxBadge` for status / priority,
  `DxTime` for ISO timestamps, `s.cellTitle` / `s.cellMuted` for raw text.
- All UI imports come from `@situ/web-ui` (the package barrel).
- `index.ts` is a one-line re-export.

## Avoid

- A list view that fetches data itself — that's the page adapter's job
  (see `situ-policy-page-adapter-shape`).
- Inline column arrays inside the JSX.
- A `<table>` element instead of `<DxTable>`.
- Importing from deep paths inside `@situ/web-ui` packages.
- Free-form date / status text — go through `DxTime`, `DxBadge`.

## See also

- `situ-policy-detail-view-shape`
- `situ-policy-page-adapter-shape`
- `situ-policy-storybook-stories`
