---
name: situ-policy-repository-module-shape
description: Use whenever creating a new repository, reviewing an existing one, or adding files under projects/app/src/repositories.
---

# Repository Module Shape

Each persistent entity owns a folder under `projects/app/src/data/repositories/`.

```text
repositories/<entity>/
├── <entity>-repository.ts   # the repository object + types
└── index.ts                 # barrel
```

```ts
// index.ts
export { computeTargetRepository, type ComputeTargetStatus } from "./compute-target-repository";
```

## Rules

- `repositories/<entity>/` contains exactly two files:
  `<entity>-repository.ts` and `index.ts`.
- The barrel re-exports the repository object plus shared types.
- The repository module exports a single object named `<entity>Repository`
  (camelCase) holding all public methods.
- DB row types come from `typeof <table>.$inferSelect`; expose them under
  `*Record` names where re-exported.
- Cross-module callers import from the folder
  (`from "../repositories/experiments"`), not the deep file.
- Shared helpers (`createStatusRecordTransitions`, `clampRepositoryLimit`,
  `matchesRepositorySearch`, `ResearchRecordStatus`) live in
  `repositories/__shared__/`.

## Exceptions

- `repositories/__shared__/` has three files instead of two — it's the shared utility module, not an entity.
- Domain-specific helpers (e.g., `normalizeMeasurementPayload`) may be exported from their owning module when sibling repositories consume them. Generic helpers belong in `repositories/__shared__/`.

## Avoid

- A new entity adds files outside the two-file shape without a recorded reason.
- A repository module exports a generic helper next to the repository object.
- A caller imports `<entity>-repository.ts` directly, bypassing the barrel.

## See also

- `situ-policy-find-require-pair`
- `situ-policy-repository-function-vocabulary`
- `situ-policy-barrel-exports`
