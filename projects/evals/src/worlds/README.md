# Eval Worlds

A "world" is a deterministic test environment. Two axes shape this directory:

1. **WORLD identity** — what is being simulated. One subfolder per world
   (e.g. `tiny-autoresearch/`). The world's domain rules and durable-state
   shape live in `packages/worlds/<name>/`; its fixtures live in
   `packages/fixtures/<name>/`.
2. **MODE** — how the world is driven. Two flavors are baked into the runner
   subprocess boundary:
   - `state` — seed → snapshot durable state → exit (no API, fast)
   - `live-exec` — seed → run live Claude session → snapshot state (real
     API, slow)

Each world directory contains:

- `bridge.ts` — typed wrapper around `runBridgeCommand`; one function per mode
- `runner.ts` — subprocess entry; dispatches `state | live` from argv
- `state.eval.ts` — Evalite-backed test suite using the bridge in state mode
- live eval entry point — script that uses `live-exec` mode with real Claude
  Managed Agents

To add a world: copy an existing folder, point `bridge.ts` at the new world's
runner + fixtures, and write scenarios in either tests or live eval scripts.
The shared kernel lives in `__shared__/` and is consumed from its barrel by
sibling world folders.
