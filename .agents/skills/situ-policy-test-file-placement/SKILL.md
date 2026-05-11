---
name: situ-policy-test-file-placement
description: Use whenever adding, modifying, or reviewing test files anywhere in the repo — placement, naming, framework choice, environment setup.
---

# Test File Placement

Tests live next to the source they exercise.

## Rules

- `<source>.test.ts` (or `.test.tsx` for React) in the same folder as
  `<source>.ts`. No `__tests__/` or `tests/` folders.
- Cross-cutting tests (e.g., contract tests across many modules) are
  named for what they test:
  `repositories/repository-contracts.test.ts`.
- **Framework follows the package.** `projects/app/src/**` uses
  `bun:test` (`import { describe, expect, test } from "bun:test"`),
  invoked through the per-target `bun --filter=@situ/app run test:*`
  scripts. `projects/web/**`, `projects/evals/**`, and
  `projects/e2e-tests/**` use Vitest. See
  [`.agents/docs/web-testing/DOC.md`](../../docs/web-testing/DOC.md) for
  the React + Replicache setup.
- Tests may mutate `process.env.SITU_*` for setup but reset in
  `afterEach` / `afterAll`.
- A failing or flaky test is fixed or deleted. Nothing is `.skip`-ed for
  more than one PR without a recorded reason.

## Avoid

- A test imports a sibling source via a deep relative path that bypasses
  the public surface — usually a sign the source needs a smaller unit to
  test.
- A `__tests__/` or `tests/` folder anywhere in `projects/`.
- Test setup mutating real `~/.situ` state instead of a temp dir under
  `SITU_HOME`.
- Mixing test frameworks within one package — pick the one the package
  is set up for and stay consistent.

## See also

- `.agents/docs/testing/DOC.md` — principles + app-side bun:test patterns
- `situ-policy-file-naming` — file naming convention shared with source
- `situ-policy-react-hook-testing` — when a hook deserves a test
- `situ-policy-e2e-test-shape` — Playwright fixture pattern
- `.agents/docs/web-testing/DOC.md` — full web test setup + Replicache
  strategy
