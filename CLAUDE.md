# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Situ is a local web app for running Claude Managed Agent sessions that drive a research loop. A single `situ` Bun process serves both the Hono backend (REST + Replicache sync) and the React SPA starting at `http://127.0.0.1:5500`, falling forward to `5501`, `5502`, and so on when the default port is busy. In dev, Vite is mounted as middleware on the same Hono server — there is no second port. Per-session state lives in `~/.situ/sessions/<id>/session.sqlite`; the Anthropic key lives separately in `~/.situ/secrets.json`.

The README has the user-facing quick start; this file documents the things you need multiple files to see.

## Common commands

All workflows go through `mise`. The top-level scripts in `package.json` just shell out to `mise run …`, so prefer the mise form.

- `mise run update` — install workspace deps and sync git hooks (lefthook)
- `mise run check` — the full CI gate: oxfmt --check, oxlint, markdownlint, typos, actionlint, `.agents` policy lint, tsgo project references, then every `test:*` script for `@situ/app`, the eval suites, and `vitest run` for web packages (see `scripts/check.sh`)
- `mise run test` — unit tests only (no typecheck/lint), same composition as `scripts/test.sh`
- `mise run lint:policies` — structural lint of `.agents/skills/*` (cross-refs, sections, voice, format)
- `mise run app` — run the local app from source with Vite middleware
- `mise run e2e-tests` — Playwright suite under `projects/e2e-tests/` that boots the real CLI against a temp `SITU_HOME`
- `mise run evals` — live agent evals (require `SITU_ANTHROPIC_KEY`). Non-LLM eval checks run via `mise run test`.
- `mise run db:generate` / `mise run db:migrate` — drizzle-kit for the per-session SQLite schema
- `mise run release:build` — build a platform tarball under `dist/release/`
- `mise run fallow:audit -- --changed-since main` — quality gate that pre-push runs

### Running a single test

`@situ/app` uses `bun test`; web packages use `vitest`; evals use `evalite`.

- One app test file: `bun --filter=@situ/app test src/path/to/file.test.ts`
- A pre-grouped slice (see `projects/app/package.json` scripts): e.g. `bun --filter=@situ/app run test:skills`, `test:tools`, `test:prompts`, `test:automation`, `test:research-projects`, `test:repositories`, `test:worktrees`, `test:compute`, `test:observability`, `test:settings`, `test:diagnostics`, `test:modules`, `test:cli`
- One web test file: `bun x vitest run path/to/file.test.ts`
- A single evalite suite: `bun --filter=@situ/evals exec evalite run src/prompts.eval.ts --hideTable --noCache`

`scripts/check.sh` is the single source of truth for which test slices are required — add a slice there if you add a new one.

## Workspace layout

Bun workspaces, declared in the root `package.json`. The shared dep `catalog:` there pins versions across packages — add new shared deps to `workspaces.catalog`, then reference `"catalog:"` from each package.

- `projects/app/` (`@situ/app`) — the CLI + Hono server + Managed Agent runtime. Everything backend lives here.
- `projects/web/` (`@situ/web`) — the SPA. Built by Vite; served by `@situ/app` in both dev (middleware) and prod (static).
- `projects/web/packages/`
  - `design-tokens` (`@situ/web-design-tokens`) — `tokens.css` for colors/type/radii/motion, light + dark via `:root[data-theme="dark"]`
  - `ui` (`@situ/web-ui`) — vanilla-extract `dx-*` primitives, Storybook on `:6006`
  - `app-ui` (`@situ/web-app-ui`) — Situ-specific page views consuming the primitives, Storybook on `:6007`
  - `protocol` (`@situ/protocol`) — shared record types crossing the wire (Replicache, routes)
- `projects/evals/` (`@situ/evals`) + `projects/evals/packages/{fixtures,worlds}` — evalite-driven prompt/runtime-skill scoring plus fixture worlds and live agent eval entry points
- `projects/e2e-tests/` — Playwright smoke suite against the real `situ` CLI
- `projects/docs/` — VitePress site (`mise run docs:dev`)

## App architecture (`projects/app/src/`)

Entry point is `cli.ts` → `server.ts`. The CLI dispatches subcommands (`exec`, `report`, `compute`, `sessions`, `status`, `events`, `instructions`, `self-update`, `skills`, `doctor`) before falling through to the long-running app server. `parseRootCommand` in `cli/root-command.ts` is the registry; `cli/command-checks.ts` validates it (run by `mise run check`).

Source tree, by responsibility:

- `claude/agents/` — everything Managed-Agent-related
  - `roles/{manager,scientist,verifier,scribe,reporter}/{blueprint,system}.ts` and `roles/registry.ts` — the five roles. Each blueprint declares the model, allowed tools, and system prompt. Manager/Scientist/Verifier pick their model from `DEFAULT_CLAUDE_AGENT_MODEL` (effort-driven via `SITU_EFFORT`); Scribe is locked to Sonnet regardless of effort; Reporter defaults to Opus and accepts a per-invocation `modelOverride` for `situ report --effort`.
  - `tools/` — one file per custom tool (~72 files: `create-*`, `accept-*`, `complete-*`, `fail-*`, `cancel-*`, `get-*`, `add-*-comment`, etc.). Every tool is declared via `defineTool({ ..., resultEnvelope: true })` from `tools/__shared__/define-tool.ts` — it parses input with the zod `inputSchema`, derives the wire-format JSON Schema via `z.toJSONSchema`, and expects the handler to return `Result.ok(data)` / `Result.fail({ code, hint, details? })` from `tools/__shared__/result.ts`. The wrapper catches `ZodError` (→ `invalid_input`), `PreconditionError` from repositories (preserves `code` / `hint` / `details`), and unknown errors (→ `internal_error`), serializing each as a JSON envelope on `content`. Context fallbacks (`researchProjectId`, `researchTaskId`) go through `toolContextModule({ explicit, context })`. The registry test enforces shape.
  - `skills/` — runtime skill registry + uploader. Skills are uploaded lazily when Situ creates/updates Claude agents (`situ skills sync` forces it).
  - `runs/` — Claude session/run lifecycle: `enqueue-turn`, `execute-turn`, `reconcile-session`, `handle-custom-tool-use`, `prompts.ts`, `run-state.ts`. `role-for-work-item.ts` picks the role for a queued work item.
  - `resources/` — Claude resource handles (sessions, runs, agents).
- `runtime/` — execution loop around the agent roles
  - `scheduler/` — periodic job runner started in `cli.ts`
  - `work-items/` — durable queue: claim tokens, leases, retries
  - `dispatch/` — domain dispatch: `research-projects.ts` (and its test) is the canonical example of how a domain event becomes a work item becomes a Managed Agent turn
  - `compute/` — compute target pools and leases (`compute list/add/drain/restore/remove` CLI surface lives here)
  - `automation/` — `runner.ts` is the headless `situ exec` loop; also hosts live-agent-slice evals
  - `worktrees/` — git worktree management for experiment runs
- `data/` — persistence
  - `db/` — drizzle schema + migration runner; per-session SQLite at `~/.situ/sessions/<id>/session.sqlite`
  - `repositories/` — typed access modules. The vocabulary is enforced (`get` / `require` / `find` / `list`). All mutations go through `runSyncedWrite`, which both writes and notifies Replicache subscribers in one step — never hand-roll a write.
- `routes/` — Hono mounts under `/api`. The Replicache surface (`replicache-pull`, `replicache-poke`, `replicache-patch`, `replicache-sync`, `replicache-records/`) is what the SPA actually consumes. Route bodies that take JSON go through `parseRouteBody({ context, schema })` from `routes/__shared__/parse-route-body.ts` — pass a zod schema, get either `{ ok: true, value }` or `{ ok: false, response }` with a 400 envelope ready to return.
- `spa/` — Vite dev handler + built-asset resolver; chooses dev/prod mode in `cli.ts`'s `resolveAppMode`.
- `cli/` — subcommand handlers (`automation-commands`, `compute-command`, `read-only-commands`, `self-update-command*`, `skills-command`).
- `config/` — runtime options parsing, session context bootstrap, install info, logging/observability config.
- `observability/` — OTel + LogLayer/Pino setup wired into Hono.
- `modules/` — package-wide capability modules (`dateTimeModule`, `jsonModule`, `textModule`, `logModule`, `commandLineModule`, etc.). `jsonModule` (in `modules/json/`) is the single seam for the "unknown → `Record<string, unknown>`" pattern: `jsonModule.record({ value })` coerces, `jsonModule.parseRecord({ raw })` parses-and-coerces a JSON string with `{}` fallback, `jsonModule.readRecordFile({ path })` reads a JSON file with ENOENT-safe fallback. Use these rather than hand-rolling `try { JSON.parse } catch { return {} }`.
- `secrets/`, `diagnostics/`, `app-events/` — supporting utilities.

## The end-to-end research loop

This is the conceptual flow you need to keep in mind when touching anything cross-cutting. Every arrow has a file-backed source in current code; `.agents/skills/situ-context-research-flow/SKILL.md` is the authoritative map.

```text
user goal
  → ResearchProject (durable)
  → Manager onboarding (asks user questions, presents baseline)
  → baseline confirmation flips project phase out of onboarding
  → Manager plans ResearchTask rows
  → Scientist claims tasks and submits work for verification
  → Verifier judges, updates task state and project evidence
  → Replicache pushes the new rows to the SPA workspace view
```

Names to watch for: `ResearchProject`, `ResearchTask`, `ResearchTaskVerification`, `ResearchProjectInteraction`. Old names (`AgentObjective`, `ResearchMove`, `Critic`, `agent-objective`, `situ-critic`) should only appear in compat cleanup or forbidden-marker evals — if you see them in new code, that's a bug.

## Web data flow

Routes live in `projects/web/src/routes/` (TanStack Router, code-generated `routeTree.gen.ts`). Each page in `projects/web/src/pages/` is a _page adapter_ — it gathers data via hooks in `projects/web/src/hooks/<feature>/` (which subscribe to Replicache key prefixes) and passes props to a view in `@situ/web-app-ui` under `projects/web/packages/app-ui/src/pages/<feature>-view/`. The view itself only knows about app-ui domain records, not Replicache.

When you add a new synced entity, you must touch all of: a repository write path with `runSyncedWrite`, Replicache pull membership in `routes/replicache-records/`, a hook in `projects/web/src/hooks/`, and a page adapter that hands the data to the app-ui view. Skipping any of these leaves the UI stale.

## The `.agents/` meta-layer

`.agents/skills/` is roughly 80 governance skills enforced by `mise run lint:policies` and consumed both by humans and by the Manager/Scientist/Verifier agents at runtime. Three kinds matter when you're editing the repo:

- **Context skills** (`situ-context-*`) — orientation maps for an agent picking up a question. Start with `situ-context-main`; specialize into `-research-flow`, `-runtime`, `-web`, `-evals`, `-meta`. Load `situ-context-codebase-priorities` when making refactor/cleanup/abstraction tradeoffs.
- **Policy skills** (`situ-policy-*`) — shape rules for individual surfaces (route shape, repository function vocabulary, drizzle query style, tool surface, page adapter shape, file naming, file size, JSON columns, FK column naming, etc.). When you touch a surface, load the matching policy.
- **Workflow skills** (`situ-add-*`, `situ-run-*`, `situ-review-*`, `situ-verify-*`, `situ-audit-policies`, `situ-lint-policies`, `situ-curate-meta-layer`) — procedures for adding/running/reviewing things.

`.agents/docs/` holds longer-form references (`evals-playbook`, `evals-strategy`, `failure-modes`, `live-eval-observation`, `meta-layer`, `observability`, `testing`, `verified-search-flow`, `web-testing`).

Don't restate policy content as inline comments — the policy is the source. If you find a policy is wrong or stale, fix the policy file under `.agents/skills/` rather than working around it.

## Tooling notes

- **Formatter / linter**: `oxfmt` and `oxlint` (not Prettier/ESLint). `mise run format` writes; `mise run format:check` verifies.
- **Type checker**: `tsgo` (TypeScript native preview). `bun x tsgo --build` uses project references.
- **Package manager**: `bun@1.3.13`, pinned. `bun.lock` is committed.
- **Git hooks**: lefthook (`lefthook.yml`). Pre-commit runs oxfmt/oxlint/markdownlint/typos/actionlint on staged files; pre-push runs `mise run check` and `mise run fallow:audit -- --changed-since main`.
- **Dead-code / duplication**: Fallow. Baselines under `.fallow/`; refresh with `mise run fallow:baseline`.

## Concurrent edits

`AGENTS.md` is the standing rule: if the worktree changes underneath you while you're working, stop and reassess before making more edits. Don't patch around someone else's concurrent change unless the fix is obvious, tightly scoped, and doesn't reinterpret their edits — otherwise leave things as-is and report what you saw.
