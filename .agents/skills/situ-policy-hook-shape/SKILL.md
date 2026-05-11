---
name: situ-policy-hook-shape
description: Use whenever adding, modifying, or reviewing a Replicache-backed React hook under projects/web/src/hooks — new entity hooks, hook-folder shape, or sync-payload reads.
---

# Hook Shape

Each entity owns a folder under `projects/web/src/hooks/` containing one
file per hook plus an `index.ts` barrel. Hooks delegate to the generic
`useEntity` / `useEntityList` / `useEntityListWhere` / `useEntityCount`
helpers from `hooks/entity/`.

```text
hooks/
├── entity/                          # foundational generics
│   ├── use-entity.ts
│   ├── use-entity-count.ts
│   ├── use-entity-list.ts
│   ├── use-entity-list-where.ts
│   └── index.ts
├── hypotheses/
│   ├── use-hypothesis.ts
│   ├── use-hypotheses.ts
│   └── index.ts
└── activities/
    ├── use-activities-for.ts        # internal helper, not in barrel
    ├── use-hypothesis-activities.ts
    └── index.ts
```

```ts
// hooks/hypotheses/use-hypothesis.ts
import type { HypothesisRecord } from "@situ/protocol";
import { useEntity } from "../entity";

export function useHypothesis(id: string): HypothesisRecord | undefined {
  return useEntity<HypothesisRecord>("hypotheses/", id);
}
```

```ts
// hooks/hypotheses/index.ts
export { useHypothesis } from "./use-hypothesis";
export { useHypotheses } from "./use-hypotheses";
```

## Rules

- Folder name: `hooks/<plural-entity>/`
  (`hypotheses/`, `research-projects/`, `evaluations/`).
- One hook per file, kebab-case after the function name
  (`use-hypothesis.ts` exports `useHypothesis`).
- Each entity folder has an `index.ts` barrel re-exporting every public
  hook. Cross-folder imports go through the barrel
  (`from "../../hooks/hypotheses"`), not the deep file path.
- List hook: `use<PluralEntity>(): EntityRecord[]` — no args.
- Single hook: `use<Entity>(id: string): EntityRecord | undefined`.
- Hooks delegate to `useEntity*` helpers from `../entity`. No ad-hoc
  Replicache reads inside entity folders.
- Record types come from `@situ/protocol` — never redeclare locally.
- Key prefix matches the Replicache key shape (e.g., `"researchTasks/"`,
  `"hypotheses/"`).
- Internal helpers (e.g. `useActivitiesFor` shared by per-entity
  activity hooks) live as siblings inside the folder but are _not_
  re-exported from `index.ts`. Privacy is signaled by absence from the
  barrel, not by file naming.

## Avoid

- A flat `hooks/<entity>.ts` file with multiple hooks bundled — split
  into per-hook files in a folder.
- A folder lacks `index.ts` and callers reach into deep paths.
- A hook file exports more than one hook function.
- Hooks that filter, sort, or transform records — pages and views
  handle that.
- Hooks that return promises or trigger fetches — they are synchronous
  reads from Replicache state.
- A page reading from `useEntity` directly with raw key strings instead
  of going through the entity-specific hook.

## See also

- `situ-policy-page-adapter-shape`
- `situ-policy-protocol-record-types`
- `situ-policy-barrel-exports`
