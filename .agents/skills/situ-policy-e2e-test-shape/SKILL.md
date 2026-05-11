---
name: situ-policy-e2e-test-shape
description: Use whenever adding, modifying, or reviewing a Playwright e2e test under projects/e2e-tests/tests — new spec files, shared helpers, or fixture changes.
---

# E2E Test Shape

Each e2e scenario gets its own `<scenario>.spec.ts` file. Shared
helpers, types, and the Playwright `test` fixture live in
`tests/fixtures.ts`. Specs receive an isolated `stack` per test.

Product E2E tests prove that the shipped app and infrastructure work from a
user or API boundary. They should not be used to grade agent reasoning quality;
model-dependent Manager, Scientist, or Verifier behavior belongs in
`projects/evals` as a live agent eval.

```text
projects/e2e-tests/tests/
├── fixtures.ts             # custom test fixture + shared helpers
├── runtime-smoke.spec.ts   # one scenario per file
└── <scenario>.spec.ts
```

## Why

The `stack` fixture wraps `mkdtemp` + `SITU_HOME` isolation per test, so
tests never collide on disk and never touch the developer's real
`~/.situ`. Centralizing the helpers means a new scenario file is
small — add a few `test(...)` blocks and rely on the fixture for setup
and teardown.

## Rules

- Spec files live at `tests/<scenario>.spec.ts` and end in `.spec.ts`.
- Specs import `test`, `expect`, response types, and helpers from
  `./fixtures` — never from `@playwright/test` directly.
- Each `test(...)` block destructures `{ stack }` (and optionally other
  fixtures from `fixtures.ts`); never call `startApp` inline.
- The fixture handles cleanup (`stack.close()`); specs never `rmSync`
  state directories themselves.
- HTTP calls go through `getJson` / `postJson` / `pullReplicache` /
  `runAppCliJson` from `fixtures.ts`. Never call `fetch` directly.
- Live-only tests (the live Managed Agent flow) gate on
  `SITU_E2E_SKIP_LIVE_AGENT` and read `SITU_ANTHROPIC_KEY` explicitly.
- Prefer fake or canned agent output when the goal is to prove product
  persistence, routing, or UI behavior. Use evals when the goal is to judge
  agent prompt/tool behavior.
- Playwright config (`playwright.config.ts`) keeps `fullyParallel: false`
  and `workers: 1` so SQLite contention can't masquerade as flake.
- New shared helpers go into `fixtures.ts` and are exported by name.

## Avoid

- A spec file that opens its own temp dir or sets `SITU_HOME`
  directly — use the `stack` fixture.
- A spec importing from `@playwright/test` instead of `./fixtures` —
  the custom `test` is the only correct entry point.
- Inline `fetch()` calls bypassing the JSON helpers.
- Cross-spec state assumptions — every test starts from a fresh
  `stack`.
- Adding browser-bound tests with `bun test`-style imports — use the
  Playwright fixture.
- Assertions about research quality, verifier judgment, or explore/exploit
  strategy based on fake model output.

## See also

- `.agents/docs/testing/DOC.md` — testing principles across all stacks
- `situ-policy-test-file-placement`
- `situ-policy-configuration-env-vars`
- `situ-policy-distribution-install`
