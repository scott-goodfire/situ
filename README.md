# Autoresearch Harness

A local-first terminal observability layer for autoresearch sessions.

The first runnable slice is a local TypeScript Ink TUI talking JSON-RPC over
stdio to a Python harness. The harness records objectives, sessions,
hypotheses, experiments, activities, artifacts, and events in local SQLite state under
`~/.almanac/projects/<project-id>/`.

Start here:

- `.agents/specs/README.md` - numbered product spec index
- `.agents/policies/DOC.md` - numbered policy and review rubric index
- `.agents/docs/agents-surface/DOC.md` - `.agents` structure conventions
- `AGENTS.md` - instructions for coding/design agents working in this repo

## Quick Start

```bash
mise run update
mise run start
```

Equivalent start path:

```bash
mise run start
```

Run against another local workspace:

```bash
mise run start -- ~/sandbox/some-repo \
  --objective "Improve the project behavior without breaking correctness." \
  --context "Run make eval from the repo root. It prints the metrics and checks that matter."
```

See `examples/micrograd-sandbox/` for a concrete external-repo smoke test.

## Commands

```bash
mise run update
mise run check
mise run protocol:generate
mise run dev:harness
mise run dev:tui
mise run start
mise run web
mise run web:smoke
mise run clear -- ~/sandbox/some-repo
```

`mise run web` serves the built local project home and attach-only project
monitors. Use `mise run web -- --rebuild` to force a browser rebuild before
serving, `mise run web:dev` for the Vite development server, and
`mise run web:smoke` to build and verify the local host, discovery API, and
project-route fallback.

## Agent Runtime And Observability

The Python harness now initializes:

- Pydantic AI for typed agent planning
- pydantic-ai-backend workspace tools for bash/filesystem/search/edit access
- DBOS for durable agent execution state
- Logfire for Pydantic AI / DBOS / harness traces

The default agent runtime requires an Almanac-scoped OpenAI key. Runtime
execution should fail loudly if the key is missing rather than falling back to a
deterministic model.

To send traces to Logfire, set a write token in your shell or local env file:

```bash
export ALMANAC_LOGFIRE_TOKEN="..."
```

To use OpenAI-backed Pydantic AI planning:

```bash
export ALMANAC_OPENAI_KEY="..."
```

When `ALMANAC_OPENAI_KEY` is present, Almanac uses its code default model,
currently `openai:gpt-5.5`.

DBOS stores its system database beside Almanac project state by default:

```text
~/.almanac/projects/<project-id>/dbos.sqlite
```

Non-secret runtime defaults, including model names, Logfire service names, DBOS
settings, and local state paths, live in typed code config rather than user env
vars. The intended user-facing env vars are only `ALMANAC_LOGFIRE_TOKEN` and
`ALMANAC_OPENAI_KEY`.

## Evals

Almanac has a small code-first eval layer for prompt, tool-call, and
observability behavior:

```bash
mise run evals
mise run evals -- --case suspicious
mise run evals:json
```

The first suite uses a mocked micrograd world with baseline, A/B/C variants, an
A+C combination, and one suspicious result. Evals require `ALMANAC_OPENAI_KEY`
for real LLM calls and `ALMANAC_LOGFIRE_TOKEN` so eval executions are sent to Logfire with
`service_name=almanac-evals`.

## Layout

```text
evals                     Code-first evals and fixture worlds
projects/harness              Python local runtime
projects/tui                  TypeScript Ink TUI
shared/python/protocol        Pydantic protocol source of truth
shared/typescript/protocol    generated TypeScript protocol types
shared/typescript/rpc-client  JSON-RPC stdio client
workers/local_command_worker  legacy JSON-RPC worker scaffold
examples/micrograd-sandbox    external workspace smoke-test recipe
protocol/json-schema          generated JSON Schema contracts
```
