---
title: Module Organization
status: active
---

# Policy: Module Organization

## Applies To

New modules, refactors, eval suites, harness runtime packages, repositories,
tools, workers, and agent-facing architecture across the codebase.

## Rule

Every concept gets its own directory, even if it currently contains a single
file. The directory establishes the contract: this is its own thing, with room
to grow. Future contributors (humans and agents) should always be adding to a
directory, never deciding whether to promote a `.py` to a directory.

```text
<category>/<concept>/<role>.py
```

- `<category>` — `records`, `repositories`, `tools`, `cli`, `core`, `agents`, `api`, ...
- `<concept>` — the entity, command, or subsystem (`project`, `start`, `notifications`)
- `<role>.py` — what kind of code lives here (`record.py`, `repository.py`, `command.py`, `tool.py`, `models.py`, `registry.py`, `manager.py`, `runtime.py`, `configure.py`, ...)

`__init__.py` is the public surface of every concept directory. External
callers import from the directory; the leaf file is an implementation detail.
This means renaming or splitting leaf files never breaks callers.

## Why this shape

- **Consistent navigation.** Every concept looks the same. There is no "is this
  big enough yet to be a folder?" decision.
- **Predictable extension.** When a concept grows, you add a file alongside the
  existing one — no migration, no rename of callers.
- **Stable imports.** Callers go through `__init__.py`. Internal restructuring
  is a non-event for the rest of the codebase.
- **Co-location.** A concept's tests, fixtures, models, and implementation can
  sit together when it makes sense.

The trade-off is more directories. Accepted.

## Required Checks

- One concept per directory. The directory name is the concept; the file name
  is the role.
- One primary class, function group, or artifact per leaf file.
- Use **role-named leaf files**: `record.py`, `repository.py`, `command.py`,
  `tool.py`, `models.py`, `schemas.py`, `service.py`, `registry.py`,
  `manager.py`, `runtime.py`, `configure.py`, `evaluator.py`, `case.py`,
  `scenario.py`, `runner.py`, etc. Never `module.py`. Never the directory name
  repeated (no `paths/paths.py`).
- `__init__.py` files are small re-export surfaces. Substantial implementation
  does not live in `__init__.py` unless the concept is genuinely a single
  module (rare).
- Shared helpers within a category live in `_shared/<role>.py`. The leading
  underscore is a Python privacy convention (PEP 8): `from pkg import *`
  skips underscore-prefixed names, and linters/IDEs treat them as
  implementation detail. Major libraries follow the same pattern with
  different nouns: `pip/_internal/`, `pip/_vendor/`, `numpy/_core/`,
  `pandas/_libs/`. We use `_shared/` because the directory's purpose is
  helpers shared between sibling concepts at this level — that reads more
  intuitively than `_internal/` in our application layout. Group helpers by
  purpose (`_shared/rpc.py`, `_shared/output.py`) rather than dumping
  everything into one file.
- Split broad `models.py`, `records.py`, `repositories.py`, `utils.py`,
  `helpers.py`, or `evaluators.py` files immediately when they cross concept
  boundaries.

## Canonical layouts

### Records (durable state shape)
```text
records/
  project/
    __init__.py        # re-exports ProjectRecord, ProjectStatus, parse_project_status
    record.py          # the Pydantic model + status enum + status parser
```

### Repositories (durable state CRUD)
```text
repositories/
  project/
    __init__.py        # re-exports ProjectRepository
    repository.py      # CRUD methods using Database
    command.py         # input Pydantic models with extra="forbid"
```

### API services (read-side composition)
```text
api/
  sessions/
    __init__.py
    service.py         # SessionsService — composes multiple repositories
    schemas.py         # response Pydantic models
```

### Tools (agent-callable actions)
```text
tools/
  projects/
    create_project/
      __init__.py
      tool.py          # subclass of BaseSituTool with execute_sync
      models.py        # return type extending SituToolReturn
```

Group tools by entity (`projects/`, `hypotheses/`); cross-cutting tools get
their own group (`comments/`, `links/`, `workspace_state/`). Register all
tools in `tools/toolsets.py`.

### Agents
```text
agents/
  research/
    __init__.py
    agent.py           # name, output type, Agent instance
    prompt.py          # *_INSTRUCTIONS constant + build_*_prompt builders
```

### CLI / headless commands
```text
cli/
  commands/
    __init__.py        # re-exports main
    main.py            # argparse setup + dispatch table
    _shared/
      arguments.py
      tui.py
    start/
      __init__.py
      command.py       # the start handler function
    web/
      __init__.py
      command.py
  headless/
    __init__.py
    _shared/
      rpc.py
      output.py
      snapshot.py
      timing.py
      workspace.py
    status/
      __init__.py
      command.py       # the status handler function
    exec/
      __init__.py
      command.py
```

### Core (cross-cutting harness infrastructure)
```text
core/
  db/                  # multi-file subsystem
    database.py
    migrations.py
    serialization.py
    project_registry.py
  notifications/
    __init__.py
    registry.py        # project-scoped notification fan-out
  paths/
    __init__.py
    resolve.py         # resolve_app_root, resolve_workspace
  project_context/
    __init__.py
    context.py         # ProjectContext class
  observability/
    __init__.py
    configure.py       # Logfire setup + span helper
  trust/
    __init__.py
    checks.py
  workers/
    __init__.py
    manager.py
  dbos/
    __init__.py
    runtime.py
```

`core/` is for cross-cutting harness infrastructure. Product-state concepts do
not live in `core/`; they live in `api/`, `repositories/`, `records/`,
`tools/`, `agents/`, or another product-facing domain folder.

### Harness package root

The harness package keeps a small set of files at its root: the running
service (`app.py`, `agent_runtime.py`, `stdio.py`) and the package wiring
(`__init__.py`, `__main__.py`). Everything else lives inside a category
directory.

```text
projects/harness/src/situ/harness/
  __init__.py
  __main__.py
  stdio.py             # JSON-RPC stdio loop
  app.py               # HarnessApp dispatcher
  agent_runtime.py     # Pydantic AI + DBOS wrapper
  cli/
  core/
  records/
  repositories/
  api/
  tools/
  agents/
  config/
```

## Frontend layout

The frontend follows the same "every concept gets its own directory" spirit as
the harness, with three TypeScript-specific conventions.

### Selector layer (read-side composition, mirrors `repositories/`)

Selector functions — filters, sorts, joins, and derivations over the
TanStack-DB collections — live at the top of the web app, parallel to `app/`,
`features/`, and `server/`. One folder per entity, mirroring the backend's
`repositories/<entity>/` layout.

```text
projects/web/src/selectors/
  hypotheses/
    index.ts             # re-exports the public surface
    query.ts             # read-side filters and derivations (e.g. hypothesesForProject)
    relationships.ts     # cross-entity joins (e.g. experimentsForHypothesis)
  experiments/
    index.ts
    query.ts
    relationships.ts
  evaluations/
    index.ts
    query.ts             # evidenceState, latestMeasurement, etc.
    relationships.ts     # evaluationsForExperiment, evaluationsForExperiments
  ...
```

When mutations show up later, add `command.ts` next to `query.ts` for the
write-side helpers — same shape as the backend's `repository.py` + `command.py`
split.

Selectors are **not** scoped inside features. Anything filtering or deriving
data from collections belongs here. A feature page imports from
`@/selectors/<entity>` and renders.

### `__shared__/` for sibling-only helpers

Helpers shared between siblings at a layer go in `__shared__/`. Double
underscores on both sides — distinct from the harness's `_shared/` (which
exists for PEP 8 underscore-privacy semantics that don't apply in TypeScript).
The visual `__shared__` is unambiguous as "internal to this layer's parent."

```text
projects/web/src/features/project-workspace/
  __shared__/
    activity-timeline.tsx     # used by multiple sibling features
    relationship-selectors.ts (legacy — relocate to src/selectors/)
  hypotheses/
  experiments/
  evaluations/
```

Anything in `__shared__/` is internal: outside the parent directory must not
import from it. If a `__shared__/` helper grows external consumers, promote it
to the appropriate top-level directory (typically `selectors/` for data
helpers, or `app/` for chrome).

### Tests colocated

TypeScript tests live next to their implementation: `<name>.test.ts(x)` in the
same directory as `<name>.ts(x)`. No top-level `tests/` directory on the
frontend. (The Python harness keeps its package-root `tests/` — explicit
per-language divergence.)

```text
projects/web/src/server/
  discovery-api.ts
  discovery-api.test.ts        # next to its implementation
  local-web-app.ts
  local-web-app.test.ts
```

### Web project root

```text
projects/web/
  src/
    main.tsx
    global.css.ts
    styles.css.ts
    app/                # routing + AppShell + global providers
    features/           # user-facing concerns (project-index, project-workspace, ...)
    selectors/          # per-entity read-side composition
    server/             # Vite dev-server discovery API + tests colocated
    project-discovery/  # client-side types + fetcher for the discovery API
  packages/
    design-tokens/      # CSS variable definitions
    ui/                 # Dx primitives (vars + 35 components)
    app-ui/             # Situ-branded views composed from Dx
```

## Acceptable Exceptions

- Generated code can follow the generator's layout.
- Migrations from legacy code may proceed incrementally. New durable code
  must follow this layout.

## Red Flags

- A new concept added as a single `.py` file at the root of a category instead
  of in its own directory.
- A leaf file named `module.py`, or named the same as its parent directory
  (`paths/paths.py`).
- Substantial implementation in `__init__.py`. `__init__.py` should re-export.
- A catch-all `utils.py`, `helpers.py`, `models.py`, or `shared.py` accumulating
  unrelated functions.
- Imports reaching past `__init__.py` into a leaf file when the public
  re-export would suffice.
- A multi-table current-state composition modeled as a repository when it
  should be an API service.
- Frontend selectors scattered inside feature page folders
  (`features/<feature>/selectors.ts`, inline filters in render functions)
  instead of `src/selectors/<entity>/`.
- A frontend folder named `shared/` (no underscores) or `_shared/` (single
  underscore) instead of `__shared__/`.
- A top-level `tests/` directory on the frontend. TypeScript tests colocate
  with their implementation.
- A catch-all `utils.ts` or `helpers.ts` on the frontend accumulating
  unrelated functions — split by purpose into role-named files.

## Review Questions

- Does every concept have its own directory?
- Is the leaf file named after its role, not after its directory?
- Does `__init__.py` cleanly describe the public surface?
- Can a future contributor add a sibling concept by copying an existing
  directory's shape?
