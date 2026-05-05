---
title: Frontend Code Style
status: active
---

# Policy: Frontend Code Style

## Applies To

TypeScript, TSX, CSS, and frontend-adjacent shared code used by the TUI, web UI,
collection layer, local session client, and future browser surfaces.

## Rule

Prefer code that is easy for a future agent or human to scan, change, and review.
Clarity beats condensedness, cleverness, and magic.

Frontend code should make data flow and rendering decisions explicit. Use
whitespace, named arguments, named intermediate values, and straightforward
control flow when they make intent easier to see.

## Required Checks

- Prefer object/keyword-style arguments when a function has multiple inputs,
  optional inputs, booleans, callbacks, or values of the same primitive type.
- Avoid APIs where callers must remember positional argument order unless the
  function is tiny, conventional, and unambiguous.
- Prefer whitespace between logical blocks: setup, data derivation, effects,
  event handlers, render branches, and helper functions.
- Avoid dense ternaries like `a ? b : c` in render logic and state derivation.
  Use a named helper, multiline branch, or IIFE with guard statements when that
  reads more clearly.
- Keep nested ternaries out of product UI code.
- Use kebab-case for manually created frontend file and folder names, such as
  `session-summary.tsx`, `event-timeline.tsx`, and `session-client.ts`.
- Put durable components in their own kebab-case folder with the component file,
  stories, tests, styles, and helpers colocated when they exist. Prefer
  `components/session-section/session-section.tsx` over a flat component bucket.
- Keep established framework entrypoints when conventional, such as `main.tsx`
  or generated route files.
- Prefer named intermediate values over inline chains when the chain mixes
  filtering, sorting, formatting, and rendering.
- Prefer `lodash` for non-trivial filtering, sorting, grouping, object, and
  collection helpers instead of custom utility code.
- Prefer `luxon` for dates, times, durations, and ISO timestamp parsing instead
  of native `Date` math or custom date helpers.
- Prefer explicit guard statements over clever boolean expressions when failure,
  empty, loading, or disconnected states matter to the user experience.
- Keep component props explicit and descriptive. Avoid magic prop names, boolean
  flag piles, and overloaded components whose behavior is hard to infer.

## Examples

Prefer:

```ts
startSession({
  workspace,
  appRoot,
  maxExperiments,
});
```

Avoid:

```ts
startSession(workspace, appRoot, maxExperiments);
```

Prefer:

```tsx
const statusLabel = (() => {
  if (connection.kind === "connected") {
    return "Connected";
  }

  if (connection.kind === "failed") {
    return "Error";
  }

  return "Connecting";
})();
```

Avoid:

```tsx
const statusLabel = connection.kind === "connected" ? "Connected" : connection.kind === "failed" ? "Error" : "Connecting";
```

## Acceptable Exceptions

- Small conventional callbacks may use positional arguments, such as array
  mapping callbacks or React event handlers.
- A short ternary is acceptable when both branches are tiny and the expression
  stays readable on one line.
- Existing files do not need to be renamed immediately, but new durable frontend
  modules should use kebab-case.
- Small one-off components may stay local to the file that owns them until they
  become reused or independently testable.
- Library APIs can be called in their idiomatic style even when they use
  positional arguments.
- Tiny native operations are fine when they are clearer than pulling in a
  helper, such as `array.map(...)` in a render block or direct property access.

## Red Flags

- A UI state branch is compressed enough that changing it requires mentally
  reformatting it first.
- A function call has several strings, booleans, or numbers with unclear
  meaning at the callsite.
- A render block hides important loading, empty, error, or disconnected states
  inside inline expressions.
- A filename uses camelCase, PascalCase, or snake_case without a strong local
  convention.
- A helper feels magical because its name, inputs, or return shape do not reveal
  what it actually does.

## Review Questions

- Can the callsite be understood without jumping to the function definition?
- Would one more UI state make this code hard to read?
- Is whitespace separating different ideas, or is unrelated work compressed
  together?
- Does the file path match the frontend naming convention?
- Is this implementation clear enough for another agent to modify safely?
