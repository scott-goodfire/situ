---
name: situ-policy-eval-world-shape
description: Use whenever adding, modifying, or reviewing an eval world — bridge, runner, live agent evals, or anything under projects/evals/src/worlds.
---

# Eval World Shape

Live agent evals organize around **worlds** under
`projects/evals/src/worlds/`. Each world stages a real Claude Managed Agent
slice. Non-LLM checks on fixture data or seeded durable state live as
`*.test.ts` files inside `packages/fixtures/<name>/` and
`packages/worlds/<name>/`, not under `evals/src/worlds/`.

```text
evals/src/
├── scorers/                         # cross-world scoring helpers
└── worlds/
    ├── __shared__/                  # the "base"
    │   ├── run-bridge-command.ts    # generic subprocess invoker
    │   ├── types.ts                 # LiveExecOutput
    │   └── index.ts
    └── tiny-autoresearch/           # one folder per world
        ├── bridge.ts                # typed wrapper around shared invoker
        ├── runner.ts                # subprocess entry; sets up the world
        └── live-agent-eval.ts       # live agent eval entry point
```

## Rules

- **Each world directory contains three files** plus optional `index.ts`:
  - `bridge.ts` — typed wrapper around `runBridgeCommand` from
    `worlds/__shared__/`. Exposes `runLiveExecBridge` and similar
    live-only wrappers that shell out via `world.e2eRoot` to a runner
    under `projects/e2e-tests/runners/`.
  - `runner.ts` — the subprocess entry. Sets up the seeded
    `TinyAutoresearchWorld`, invokes the live exec helper from
    `@situ/evals-worlds`, prints JSON to stdout, exits.
  - `live-agent-eval.ts` — Evalite suite that drives real Claude
    Managed Agent behavior through the bridge.
- **`worlds/__shared__/`** holds the cross-world kernel:
  - `run-bridge-command.ts` — generic subprocess invoker; takes a
    `runnerEntryUrl: URL`, `args`, `timeoutMs`. Spawns `bun run`,
    waits with timeout, parses JSON stdout.
  - `types.ts` — `LiveExecOutput<S>`. Every live world conforms.
  - `index.ts` — barrel for the cross-world bridge helpers.
- **Bridge files are tiny** (≤30 lines). Anything more belongs in
  `worlds/__shared__/` (if generic) or in the world's runner / package
  (if world-specific).
- **Filenames inside the world folder don't carry the world name**
  (`bridge.ts`, not `tiny-autoresearch-bridge.ts`). The directory
  carries it.
- **The slice CLI that the bridge invokes lives under
  `projects/e2e-tests/runners/`**, not in `projects/app/src/`. It imports
  the runtime surface via the `@situ/app/runtime` subpath export.

## Avoid

- A world with an inline subprocess invoker instead of using
  `runBridgeCommand` from `__shared__/`.
- A non-LLM fixture-shape or seeded-state check living under
  `evals/src/worlds/` — those belong as `*.test.ts` in the corresponding
  `packages/fixtures/<name>/` or `packages/worlds/<name>/` package.
- A new world definition that lives only in `evals/src/worlds/` and
  not in `packages/worlds/<name>/` + `packages/fixtures/<name>/`.
  The world's domain rules and fixture pack live in their respective
  workspace packages.
- A world bridge that throws for non-zero exit but doesn't include
  stdout/stderr in the error — debugging requires both.

## Adding a new world

1. Create `packages/worlds/<name>/` with the world rules + durable
   state + live-exec helpers. Add co-located `*.test.ts` files for any
   non-LLM state-shape coverage.
2. Create `packages/fixtures/<name>/` with seed scenarios. Add co-located
   `*.test.ts` files for fixture-shape coverage.
3. Create `evals/src/worlds/<name>/` with the three orchestration files.
   Copy a sibling world's bridge as a template, change the `RUNNER_ENTRY`
   URL, change the seed name type, narrow the eval scenarios.
4. Add a runner CLI under `projects/e2e-tests/runners/` if the world needs
   a new slice driver. Otherwise reuse an existing runner.
5. Verify the live eval command runs through the `evals` package script.

## See also

- `situ-policy-eval-strategy`
- `situ-policy-evalite-marker-scorer`
- `situ-policy-fixture-shape`
- `situ-policy-subprocess-spawning`
