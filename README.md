# Autoresearch Harness

A local-first terminal observability layer for autoresearch runs.

The first runnable slice is a local TypeScript Ink TUI talking JSON-RPC over
stdio to a Python harness. The harness records runs, experiments, evidence,
signals, findings, warnings, and events in local SQLite state under
`~/.almanac/projects/<project-id>/`.

Start here:

- `.agents/specs/README.md` - numbered product spec index
- `.agents/policies/DOC.md` - numbered policy and review rubric index
- `.agents/docs/agents-surface/DOC.md` - `.agents` structure conventions
- `AGENTS.md` - instructions for coding/design agents working in this repo

## Quick Start

```bash
mise run update
mise run example:toy
```

Equivalent start path:

```bash
mise run start
```

Run against another local workspace:

```bash
mise run start -- ~/sandbox/some-repo \
  --eval-command "python almanac_eval.py --json" \
  --known-signal score
```

See `examples/micrograd-sandbox/` for a concrete external-repo smoke test.

## Commands

```bash
mise run update
mise run check
mise run protocol:generate
mise run dev:harness
mise run dev:tui
mise run example:toy
mise run start
```

## Layout

```text
projects/harness              Python local runtime
projects/tui                  TypeScript Ink TUI
shared/python/protocol        Pydantic protocol source of truth
shared/typescript/protocol    generated TypeScript protocol types
shared/typescript/rpc-client  JSON-RPC stdio client
workers/examples/toy_worker   deterministic toy worker
workers/local_command_worker  wrapper for JSON eval commands in a workspace
examples/toy-eval             toy eval fixture
examples/micrograd-sandbox    external workspace smoke-test recipe
protocol/json-schema          generated JSON Schema contracts
```
