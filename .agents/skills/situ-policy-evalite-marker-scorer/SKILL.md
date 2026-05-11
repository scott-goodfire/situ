---
name: situ-policy-evalite-marker-scorer
description: Use whenever adding, modifying, or reviewing Evalite suites under evals — new prompt evals, runtime skill evals, or other deterministic marker-based checks.
---

# Evalite Marker Scorer

Evalite suites use marker-based scorers: each case lists `required` and
optional `forbidden` strings, and the scorer returns `1` only if every
required marker appears and no forbidden marker does.

```ts
const requiredMarkers = {
  name: "required-markers",
  description: "All required prompt markers are present and forbidden markers are absent.",
  scorer: ({ output, expected }: { output: string; expected: PromptExpectations }) => {
    const missing = expected.required.filter((marker) => !output.includes(marker));
    const forbiddenHits = (expected.forbidden ?? []).filter((marker) => output.includes(marker));
    return {
      score: missing.length === 0 && forbiddenHits.length === 0 ? 1 : 0,
      metadata: { missing, forbiddenHits },
    };
  },
};
```

## Why

Marker scorers fail readably: the `metadata.missing` and
`metadata.forbiddenHits` arrays tell you exactly which contract bullet
broke. Full prompt snapshots fail unreadably (a one-character diff
fails the eval and you scan a 200-line block to find it).

## Rules

- Eval files live at `evals/<area>.eval.ts` and use
  `import { evalite } from "evalite"`.
- Each suite defines a marker scorer with `name`, `description`,
  `scorer`. The scorer returns `{ score: 0 | 1, metadata: { missing,
forbiddenHits } }`.
- Cases include `input`, `expected: { required: string[]; forbidden?:
string[] }`, and the suite-level `task` produces the string to score.
- Required markers are short, distinctive substrings of the expected
  output (a tool name, a marker phrase, a code identifier) — not full
  paragraphs.
- Fixtures are constructed via small factory helpers
  (`task(overrides)`, `hypothesis(overrides)`) so cases stay terse.

## Avoid

- Snapshot-based scorers when a marker contract would do.
- Assertions inside the `task` body — the suite's `scorer` should be the
  only thing that decides pass/fail.
- A required marker that's so generic it would pass even on broken output.
- Hidden coupling between cases — each `data` entry is independent.

## See also

- `situ-policy-eval-strategy`
- `situ-policy-runtime-skills`
