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
examples/toy-eval             toy eval fixture
protocol/json-schema          generated JSON Schema contracts
```
