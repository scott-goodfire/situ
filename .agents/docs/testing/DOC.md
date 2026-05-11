# Testing

How we test Situ. Three stacks (app / web / e2e), one set of principles.
This is the entry point — find the principle that applies, then jump to
the policy or deep-dive doc for stack specifics.

Tests prove product and infrastructure behavior. Evals prove agent behavior.
When fake or canned agent output is enough to assert the behavior, write a test.
When the assertion depends on a Manager, Scientist, or Verifier making a real
model-driven judgment, write an eval under `projects/evals`.

## Principles

Apply to every test in the repo.

- **Real services over mocks.** SQLite, Drizzle, Replicache, the
  filesystem, subprocess execution — tests use them for real. The cost
  of running a real dependency is paid once in fixture setup; the cost
  of maintaining a mock that drifts from reality is paid every change.
  When isolation matters, give each test fresh state (`mkdtemp`,
  `kvStore: "mem"`, randomized name) rather than a fake.

- **Test behavior, not implementation.** A test asserts the observable
  result of an operation: what's stored, what's returned, what side
  effect fires. If a refactor that preserves behavior breaks tests,
  the test is too coupled to internals.

- **Async cleanup is mandatory.** Tests that open resources (Replicache
  instances, subprocess handles, file descriptors) must `await
rep.close()` / `stack.close()` / equivalent in `afterEach` or
  `afterAll`. A test that leaks a resource passes locally and breaks
  CI runs later.

- **Fast tests.** Sub-second per file is the bar. Past 1s, the test is
  doing too much or hitting real network. Move slow product flows to e2e.
  Move model-dependent agent behavior to evals.

- **Names describe behavior.** A test name reads like a sentence:
  `"useEntityListWhere returns only rows matching the predicate"`.
  Not `"test_filter_returns_filtered"`. Multi-clause is fine when the
  behavior is multi-clause.

- **One concept per test.** A test exercises one behavior. Several
  assertions are fine when they describe the same behavior (e.g.
  "claim succeeds AND lease persists AND release honors owner").
  Don't merge unrelated scenarios.

## Where each stack lives

| Stack                | Framework                | Policy                            | Deep-dive                            |
| -------------------- | ------------------------ | --------------------------------- | ------------------------------------ |
| `projects/app/src`   | `bun:test`               | `situ-policy-test-file-placement` | this doc, below                      |
| `projects/web`       | vitest + happy-dom + RTL | `situ-policy-react-hook-testing`  | `.agents/docs/web-testing/DOC.md`    |
| `projects/e2e-tests` | Playwright               | `situ-policy-e2e-test-shape`      | n/a                                  |
| `projects/evals`     | Evalite + live scripts   | `situ-policy-eval-strategy`       | `.agents/docs/evals-playbook/DOC.md` |

## Tests vs Evals

Use tests for deterministic product questions:

- route, repository, migration, scheduler, work-item, and settings behavior
- Replicache collection shape and UI visibility
- product E2E flows such as settings gate, onboarding shell, and sidebar gating
- persistence/display of fake agent output
- prompt markers, runtime skill markers, fixture shape, and seeded world state
- schema invariants such as every Experiment carrying one primary
  `associatedHypothesisId`

Use evals for agentic questions:

- Manager asks the right onboarding question or establishes a baseline
- Manager plans ResearchTasks with useful worker and verification prompts
- Scientist creates evidence instead of prose-only progress
- Scientist selects or creates a primary hypothesis before creating an experiment
- Verifier catches cheating, duplicates, weak evidence, or comparability breaks
- Manager explores, exploits, retries, or stops based on verified evidence

## App-side patterns (bun:test)

The 11 test files under `projects/app/src/**/*.test.ts` share one
setup pattern. New tests follow it.

```ts
import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, beforeEach, describe, expect, test } from "bun:test";

import { ensureRuntimeContext } from "../../config/session-context";
import { getDb } from "../../data/db/client";
import { tableA, tableB } from "../../data/db/schema";

describe("my feature", () => {
  beforeAll(async () => {
    const root = await mkdtemp(join(tmpdir(), "situ-myfeature-"));
    const repoPath = join(root, "repo");
    const sessionHome = join(root, "situ", "sessions", "ses_x");
    await mkdir(repoPath, { recursive: true });
    await mkdir(sessionHome, { recursive: true });
    process.env.SITU_HOME = join(root, "situ");
    process.env.SITU_REPO_PATH = repoPath;
    process.env.SITU_DB_PATH = join(sessionHome, "session.sqlite");
    process.env.SITU_ANTHROPIC_KEY = "test-key";
    await ensureRuntimeContext({ sessionId: "ses_x" });
  });

  beforeEach(() => {
    resetTables();
  });

  test("...", async () => {
    // ...
  });
});

function resetTables(): void {
  const db = getDb();
  db.delete(tableA).run();
  db.delete(tableB).run();
}
```

### Why this shape

- **`mkdtemp` + env override** isolates state to a throwaway directory
  per test file. No two test files share a `~/.situ`.
- **`ensureRuntimeContext`** initializes the DB, runs migrations, and
  registers config. After it returns, the test can use repositories
  normally.
- **`resetTables`** runs between tests so each test starts from an
  empty DB. Migrations stay applied; only data clears.
- **Real SQLite on disk** — Bun's in-memory SQLite doesn't run our
  migrations cleanly, and disk-backed is fast enough (< 50ms per test).

### Why tests are split into 8 `test:*` scripts

`mise run check` runs `test:skills`, `test:tools`,
`test:research-projects`, `test:settings`, `test:compute`,
`test:observability`, `test:repositories`, `test:worktrees` as
separate processes. The split exists because tests share process-level
state (env vars, the cached DB connection from `getDb()`, OpenTelemetry
SDK registration) that can't be safely reset between files in the same
process. New test files extend the right group or get a new
`test:<area>` script.

### What's worth testing

- Repositories with branching logic (status transitions, JSON-column
  round-trips, foreign-key constraints) — write a contract test.
- Runtime helpers with derivation (compute leases, dispatch, work
  items) — write per-helper tests next to the source.
- App modules (`modules/date-time`, `modules/json`) — small tests
  alongside source. Cheap.
- Skip: thin wrappers over typed Drizzle queries that the type system
  already verifies.

## Web-side patterns

See `.agents/docs/web-testing/DOC.md` for the full setup. Highlights:

- vitest + happy-dom + `@testing-library/react` + jest-dom matchers
- Real Replicache instances via `createTestReplicache()` from
  `projects/web/src/test-utils/replicache.tsx`
- `renderInRouter` from `test-utils/router.tsx` for components using
  `@tanstack/react-router`
- Same principles apply: real services, async cleanup, behavior-first
  assertions.

## End-to-end (Playwright)

See `situ-policy-e2e-test-shape`. The `stack` fixture in
`tests/fixtures.ts` handles per-test isolation (`mkdtemp` +
`SITU_HOME`). Specs receive a fresh `stack` per test; never set env
vars directly.

## Coverage as a guide, not a gate

```bash
mise run coverage:app
mise run coverage:web
mise run coverage:summary 20
```

`coverage:summary` prints the bottom-N least-covered files across both
sweeps. Use it the same way we use fallow output: find the file with
0% coverage that should obviously have a test, write one, repeat. We
don't gate `mise run check` on a coverage threshold — see
`situ-spec-policy-maintenance` ("Deferred automation") for the
reasoning.

## See also

- `situ-policy-test-file-placement` — placement + framework per package
- `situ-policy-react-hook-testing` — when web hooks/components deserve tests
- `situ-policy-e2e-test-shape` — Playwright fixture pattern
- `.agents/docs/web-testing/DOC.md` — React + Replicache deep-dive
- `.agents/docs/evals-playbook/DOC.md` — Evalite runner playbook
- `.agents/docs/meta-layer/DOC.md` — where this fits in the broader stack
