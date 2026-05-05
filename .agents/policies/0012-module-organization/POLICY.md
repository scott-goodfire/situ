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
- `<concept>` — the entity, command, or subsystem (`objective`, `start`, `notifications`)
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
  objective/
    __init__.py        # re-exports ObjectiveRecord, ObjectiveStatus, parse_objective_status
    record.py          # the Pydantic model + status enum + status parser
```

### Repositories (durable state CRUD)
```text
repositories/
  objectives/
    __init__.py        # re-exports ObjectivesRepository
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
  objectives/
    create_objective/
      __init__.py
      tool.py          # subclass of BaseSituTool with execute_sync
      models.py        # return type extending SituToolReturn
```

Group tools by entity (`objectives/`, `hypotheses/`); cross-cutting tools get
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

## Review Questions

- Does every concept have its own directory?
- Is the leaf file named after its role, not after its directory?
- Does `__init__.py` cleanly describe the public surface?
- Can a future contributor add a sibling concept by copying an existing
  directory's shape?
