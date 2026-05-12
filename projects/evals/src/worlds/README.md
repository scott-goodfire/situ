# Eval Worlds

A "world" is a deterministic test environment. One axis shapes this directory:
WORLD identity — what is being simulated. One subfolder per world (e.g.
`tiny-autoresearch/`). The world's domain rules and durable-state shape live
in `packages/worlds/<name>/`; its fixtures live in `packages/fixtures/<name>/`.

Worlds under `projects/evals/src/worlds/` always exercise a real Claude
Managed Agent via subprocess — they are **live agent evals** and require
`SITU_ANTHROPIC_KEY`. Non-LLM checks on fixture data or seeded durable state
live as `*.test.ts` files inside `packages/worlds/<name>/` and
`packages/fixtures/<name>/`.

Each world directory contains:

- `bridge.ts` — typed wrapper around `runBridgeCommand` that invokes the live
  slice runner under `projects/e2e-tests/runners/` via `world.e2eRoot`.
- `runner.ts` — subprocess entry; sets up the seeded world, invokes the
  bridge, captures durable state.
- `live-agent-eval.ts` — Evalite suite that uses the bridge with real Claude
  Managed Agents.

To add a world: copy an existing folder, point `bridge.ts` at the new world's
runner + fixtures, and write live agent eval scenarios. The shared kernel
lives in `__shared__/` and is consumed from its barrel by sibling world
folders.
