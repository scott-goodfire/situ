---
name: situ-policy-eval-world-shape
description: Use whenever adding, modifying, or reviewing an eval world — bridge, runner, state-mode tests, live agent evals, or anything under projects/evals/src/worlds.
---

# Eval World Shape

Evalite-backed tests and live agent evals organize around **worlds** under
`projects/evals/src/worlds/`. The directory structure encodes a two-axis model.

```text
evals/src/
├── prompts.eval.ts                  # prompt marker tests
├── runtime-skills.eval.ts
├── scorers/                         # cross-world scoring helpers
└── worlds/
    ├── __shared__/                  # the "base"
    │   ├── run-bridge-command.ts    # generic subprocess invoker
    │   ├── types.ts                 # WorldStateOutput, LiveExecOutput
    │   └── index.ts
    └── tiny-autoresearch/           # one folder per world
        ├── bridge.ts                # typed wrappers around shared invoker
        ├── runner.ts                # subprocess entry; dispatches argv
        ├── state.eval.ts            # state-mode Evalite-backed test suite
        └── live-agent-eval.ts       # live agent eval entry point
```

## Two-axis model

1. **World identity** — what is being simulated. One subfolder per
   world. Domain rules and durable-state shape live in
   `packages/worlds/<name>/`; fixtures live in
   `packages/fixtures/<name>/`.
2. **Mode** — how the world is driven. Two flavors, baked into
   the runner subprocess boundary:
   - `state` — seed → snapshot durable state → exit (no API, fast,
     deterministic)
   - `live-exec` — seed → run live Claude session → snapshot durable
     state (real API, slow)

Both modes share the same bridge subprocess and output shape; the mode
is just an argv selector.

## Rules

- **Each world directory contains four files** plus optional `index.ts`:
  - `bridge.ts` — typed wrappers around `runBridgeCommand` from
    `worlds/__shared__/`. One function per mode (`runWorldStateBridge`,
    `runLiveExecBridge`).
  - `runner.ts` — the subprocess entry. Parses `state <seed>` and
    `live <timeout>` argv, calls `packages/worlds/<name>/`
    helpers, prints JSON to stdout, exits.
  - `state.eval.ts` — Evalite-backed test suite for state mode. Imports scenarios
    from `packages/fixtures/<name>/` and calls
    `runWorldStateBridge`.
  - `live-agent-eval.ts` — live agent eval entry point for real Claude Managed
    Agent behavior.
- **`worlds/__shared__/`** holds the cross-world kernel:
  - `run-bridge-command.ts` — generic subprocess invoker; takes a
    `runnerEntryUrl: URL`, `args`, `timeoutMs`. Spawns `bun run`,
    waits with timeout, parses JSON stdout.
  - `types.ts` — `WorldStateOutput<S>`, `LiveExecOutput<S>`. Every
    world conforms.
  - `index.ts` — barrel for the cross-world bridge helpers.
- **Bridge files are tiny** (≤30 lines). Anything more belongs in
  `worlds/__shared__/` (if generic) or in the world's runner / package
  (if world-specific).
- **A world that only supports one mode** omits the unused eval file
  and the unused bridge function. The runner can still accept both
  argv commands or just the supported one.
- **Filenames inside the world folder don't carry the world name**
  (`bridge.ts`, not `tiny-autoresearch-bridge.ts`). The directory
  carries it.

## Avoid

- A world with an inline subprocess invoker instead of using
  `runBridgeCommand` from `__shared__/`.
- Eval files at `evals/src/<name>.eval.ts` (flat) when they belong to
  a world — move them under `worlds/<name>/`.
- A new world definition that lives only in `evals/src/worlds/` and
  not in `packages/worlds/<name>/` + `packages/fixtures/<name>/`.
  The world's domain rules and fixture pack live in their respective
  workspace packages.
- A world bridge that throws for non-zero exit but doesn't include
  stdout/stderr in the error — debugging requires both.

## Adding a new world

1. Create `packages/worlds/<name>/` with the world rules + durable
   state + live-exec helpers.
2. Create `packages/fixtures/<name>/` with seed scenarios.
3. Create `evals/src/worlds/<name>/` with the four orchestration
   files. Copy a sibling world's bridge as a template, change the
   `RUNNER_ENTRY` URL, change the seed name type, narrow the eval
   scenarios.
4. Verify the state-mode test and live eval command both run through the
   package scripts.

## See also

- `situ-policy-eval-strategy`
- `situ-policy-evalite-marker-scorer`
- `situ-policy-fixture-shape`
- `situ-policy-subprocess-spawning`
