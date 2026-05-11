---
name: situ-policy-find-require-pair
description: Use whenever designing, naming, or reviewing repository lookup methods — get, require, find, or any nullable-vs-asserted entity fetch.
---

# Find / Require Pair

Lookups come in two flavors: optional (`get`) and asserted (`require`).

## Why

Two flavors prevent callers from second-guessing each other. `get` returns optional; `require` throws — which one you call documents your intent. Re-checking the result of `require` for null is a code smell that means somebody picked the wrong method.

## Rules

- Public surface: `get(input)` returns `<EntityRecord> | undefined`;
  `require(input)` throws when missing.
- `require` throws `PreconditionError` (from `data/repositories/__shared__/precondition-error.ts`) with `code: "not_found"`, a hint of `"<Entity> not found: <id>"` (capitalized entity name, explicit id), and `details` carrying the id under its named key:

  ```ts
  throw new PreconditionError({
    code: "not_found",
    hint: `Hypothesis not found: ${hypothesisId}`,
    details: { hypothesisId },
  });
  ```

- The downstream tool's `defineTool` envelope catches the `PreconditionError` and serializes it as `{ ok: false, code: "not_found", hint, details }` — handlers don't need their own try/catch.
- `require` is the only path used by status-transition factories and any
  code that follows up with another mutation. Don't re-implement the throw
  inline.

```ts
// Public surface
async get({ experimentId }): Promise<ExperimentRecord | undefined> { ... }
async require({ experimentId }): Promise<ExperimentRecord> { ... }
```

## Exceptions

- A repository may add internal helpers when same-file methods need to call the asserted variant. Pick one naming convention per file:
  - `findX` / `requireX` — used by `hypotheses`.
  - `getXRecord` / `requireXRecord` — used by `artifacts`, `baselines`, `entity-links`, `evaluations`, `experiments`.
- Repositories without internal helpers (`compute-targets`, `measurements`,
  `research-tasks`) call `<entity>Repository.require(...)` directly from
  same-file methods.

## Avoid

- A method named `get*` that throws — rename to `require*`.
- A `require*` returning `undefined` or `null` for any reason.
- Callers re-checking the result of `require*` for nullability.
- A new internal-helper convention (`fetchX`, `loadX`, `lookupX`).

## See also

- `situ-policy-repository-function-vocabulary`
- `situ-policy-error-throwing`
