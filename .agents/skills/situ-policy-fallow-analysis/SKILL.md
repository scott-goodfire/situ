---
name: situ-policy-fallow-analysis
description: Use whenever interpreting Fallow output, deciding what to fix vs ignore, adjusting `.fallowrc.json` rules, or wiring Fallow into a CI / agent loop.
---

# Fallow Analysis

Fallow is the project-wide static-intelligence layer. It catches what
tsgo and oxlint can't — unused files, unused exports, unused
dependencies, duplication, complexity hotspots, and architecture-
boundary drift — in one Rust binary.

## Why

Most of Situ's policies are review rubrics; Fallow is the mechanical
equivalent for the categories tsc can't see. A rule that says
"barrels expose only what callers need" is enforceable as
`unused-re-export`. A rule that says "split files past 400 lines" gets
tighter when paired with `health` complexity scoring. We get one tool
that turns several review-only rules into runnable checks.

## Tasks

```bash
mise run fallow                # combined analysis (dead-code + dupes + health)
mise run fallow:audit          # gate changed files only (PR mode)
mise run fallow:fix -- --dry-run  # preview auto-fixes
mise run fallow:fix            # apply auto-fixes
```

Direct invocation:

```bash
bun x fallow dead-code --format compact   # single category
bun x fallow health                       # complexity hotspots only
bun x fallow dupes                        # duplication only
bun x fallow audit --changed-since main   # PR gate
```

## Configuration

`.fallowrc.json` at the repo root. Key fields:

- `entry` — files Fallow treats as roots; everything reachable from
  these is considered "used"
- `workspaces.packages` — Bun workspace globs (mirror root
  `package.json`)
- `ignorePatterns` — files Fallow shouldn't analyze
- `dynamicallyLoaded` — runtime-loaded files that are intentionally
  reachable without imports (agent skills, plugin directories)
- `ignoreDependencies` — devDeps used implicitly (build tools loaded
  by config files)
- `ignoreExports` — exports we want to keep public even when nothing
  consumes them right now
- `publicPackages` — workspace packages whose exported surface is
  intentionally broader than in-repo consumers
- `duplicates.ignore` — generated / declarative / test-fixture files
  where clone findings are noise, not refactor targets
- `health.ignore` / `health.maxCrap` — complexity scope and threshold
  tuning, especially when CRAP uses static-estimated coverage
- `rules` — promote / demote per-issue severity
  (`unused-files: "error"`, `unused-dependencies: "warn"`)
- `boundaries` — architecture rules: which folders may import which

## Interpreting findings

- **`unused-file`** — entry isn't reachable from a registered entry.
  Fix: delete, or add the file as a new entry if it's a script /
  test runner / config that Fallow can't auto-detect.
- **`unused-export`** — symbol is exported but nothing imports it.
  Fix: drop the export. If it's part of an intended public surface
  that's not consumed yet, add to `ignoreExports`.
- **`unused-re-export`** — barrel re-exports something nothing
  consumes. Fix: drop from the barrel (see `situ-policy-barrel-exports` —
  "exports only what the rest of the app needs").
- **`unused-dependency`** — `package.json` lists a dep nothing imports.
  Fix: drop the dep, or add to `ignoreDependencies` if it's a
  build/runtime dep loaded by config (e.g., framework plugins).
- **`circular-dependency`** — module cycles. Fix: invert one edge so
  one direction is the dependency.
- **`duplicate-block`** — repeated code across files. Fix: extract only
  when the shared helper makes the call sites clearer or protects
  behavior. Add a `duplicates.ignore` glob when the duplication is
  intentional and easier to understand inline.
- **`high-cyclomatic`** / **`high-cognitive`** — function complexity
  exceeds the configured limit. Fix: split into smaller helpers
  (see `situ-policy-file-size-and-slice-plan`).
- **`boundary-violation`** — a folder imported a folder it shouldn't.
  Fix: move the symbol to the right layer, or update `boundaries:`
  if the rule was wrong.

## Keeping findings current

When Fallow output gets noisy, do a small classification pass before
changing code or config:

```bash
bun x fallow dead-code --format json | jq '.summary'
bun x fallow dupes --format json | jq '.stats'
bun x fallow health --format json | jq '.summary'
bun x fallow fix --dry-run
```

Use `.fallowrc.json` for static-analysis blind spots, not for
discomfort:

When a Fallow config exception captures a reusable judgment, update this
skill with the principle too. Keep the note high-level enough for future
agents to apply elsewhere; do not turn it into a one-off path diary.

- Add `dynamicallyLoaded` when files are loaded by runtime path
  discovery instead of imports.
- Add `ignoreDependencies` when a dependency is loaded by string,
  side-effect CSS import, config plugin, or package-boundary surface
  Fallow cannot attribute correctly.
- Add `publicPackages` for workspace packages whose exports are API
  surface for Storybook, consumers, or future package use.
- Add `duplicates.ignore` for generated output, declarative shapes,
  examples, fixtures, or other intentionally parallel code where
  extraction would reduce clarity. Low cognitive load outranks shrinking
  the duplicate-line count.
- Add a narrow repository implementation glob, such as
  `projects/app/src/data/repositories/**/*-repository.ts`, when reviewed
  duplication is intentionally parallel query, filter, activity, or
  transition code. Do not hide repository barrels, shared helpers, tests,
  or unrelated repository-adjacent files.
- Add a narrow route-family glob when reviewed duplication is
  intentionally parallel HTTP handler plumbing and extracting it would
  hide API behavior. Prefer globs that name the route family over a
  catch-all routes ignore.
- Add narrow CLI command globs when reviewed duplication is command
  branch, option-parser, output, or event plumbing where explicit
  command behavior is easier to audit than a generic dispatcher.
- Add narrow runtime transition globs when reviewed duplication is
  intentionally parallel durable-state update plus app-event code, and
  extraction would blur the distinct state-specific fields.
- Add narrow UI view globs when duplication is declarative field layout
  and extraction would make record-specific content harder to scan.
- Add narrow one-tool-per-file globs when sibling Managed Agent tools
  repeat schema/handler structure but each tool still owns distinct API
  text, role scope, and transition semantics. Do not hide the legacy
  bundled tool file or shared helpers that still need migration work.
- Add eval-suite or eval-world duplicate ignores for runner, scorer, or
  assertion boilerplate that intentionally mirrors a mode or fixture
  boundary. Keep production runtime duplication visible.
- Add `health.ignore` for generated files, tests, fixture/seed data, or
  tiny high-fan-in helpers when the health heuristic recommends splitting
  code that is already clearer as one file.
- Raise `health.maxCrap` only when CRAP is using static-estimated
  coverage and the default threshold turns simple uncovered switches
  into a wall of findings. Prefer exact coverage when it is available.

Keep real findings visible:

- App-private unused exports and unused re-exports are usually cleanup
  work; remove exports or barrels instead of suppressing them.
- Single unused files are usually delete candidates unless they are
  runtime-discovered or a missing entry point.
- Duplicate business logic across runtime files should usually become
  a helper; duplicate tests should usually be ignored only when the
  setup reads better inline.
- After each config change, compare the before/after summary and make
  sure the remaining list is more actionable, not merely smaller.

## Baselines (for adopting incrementally)

Fallow uses **per-analysis baselines** — separate files for dead-code,
health, and dupes. When wiring Fallow on a codebase with existing
findings, snapshot all three:

```bash
mise run fallow:baseline   # writes all three under .fallow/
```

Or per-analysis:

```bash
bun x fallow dead-code --save-baseline .fallow/dead-code-baseline.json
bun x fallow health    --save-baseline .fallow/health-baseline.json
bun x fallow dupes     --save-baseline .fallow/dupes-baseline.json
```

Then run with the baselines so only NEW findings fail:

```bash
bun x fallow dead-code --baseline .fallow/dead-code-baseline.json
bun x fallow health    --baseline .fallow/health-baseline.json
bun x fallow dupes     --baseline .fallow/dupes-baseline.json
```

`.fallow/.gitignore` is set to commit `*-baseline.json` files while
ignoring the runtime cache (`cache.bin`, `churn.bin`). Commit the
baselines explicitly so CI sees the same snapshot the team does.

Regenerate the baseline via `mise run fallow:baseline` after a
cleanup. The baseline should trend downward over time — a baseline
that keeps growing is a long todo list, not a quality gate.

## Avoid

- Adding everything to `ignoreExports` to silence findings — at that
  point the audit is meaningless.
- Running `fallow fix` without `--dry-run` first — auto-removal of
  unused exports can break callers Fallow couldn't see (e.g., string
  imports).
- Including `mise run fallow` in `mise run check` while the baseline
  is non-zero — every PR's check would block on unrelated rot.
- Letting the baseline drift upward without periodic cleanup — a
  baseline that grows is just a long todo list, not a quality gate.

## Reinforces

- `situ-policy-barrel-exports` — Fallow's `unused-re-export` is the
  mechanical version of "barrels export only what's consumed".
- `situ-policy-file-size-and-slice-plan` — Fallow's `health` complexity
  hotspots quantify what the file-size cap targets.
- `situ-policy-typescript-strictness` — oxlint's `import/no-cycle`
  overlaps with Fallow's circular-dependency detection; both are on.

## See also

- `situ-policy-barrel-exports`
- `situ-context-codebase-priorities`
- `situ-policy-file-size-and-slice-plan`
- `situ-lint-policies` — for linting the policy set itself
- `situ-audit-policies` — for auditing the codebase against all policies
