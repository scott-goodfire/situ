---
title: Repository Layer
status: active
---

# Policy: Repository Layer

## Applies To

Database access, repository additions, persistence refactors, API composition
over durable state, migrations, DBOS integration, and tests touching durable
project/session state.

## Rule

Harness runtime code should access durable state through repositories, not
direct SQL or ad hoc SQLite handles. Repositories own table-level persistence;
API services own multi-table composition; orchestration code owns session flow.

## Required Checks

- New durable state has a clear repository owner under
  `projects/harness/src/situ/harness/repositories/<concept>/`.
- Repository implementation files use the explicit naming pattern
  `repository.py`, for example `repositories/experiments/repository.py`.
- Repository classes inherit from `BaseRepository`, which owns the shared
  `BaseModel` + `db: Database` pattern.
- SQL execution goes through `Database`; runtime code outside `core/db/` should
  not open SQLite connections directly.
- DB infrastructure lives under `projects/harness/src/situ/harness/core/db/`.
  Schema changes live in `core/db/migrations.py`; shared JSON/time helpers live
  in `core/db/serialization.py`.
- Repositories own table-level row decoding for the tables they persist. Keep
  row-to-record helpers local to the repository that owns the corresponding
  SQL, unless a helper is genuinely shared across multiple repository owners.
- Durable record models under `records/<singular_concept>/record.py` should stay
  storage-agnostic Pydantic shapes. Do not make records know about SQLite rows
  or JSON column names.
- Repository input validators live near the repository they serve, or in a
  local `command.py`, when a method benefits from Pydantic validation before
  writing.
- Repository methods should return typed Pydantic records from
  `projects/harness/src/situ/harness/records/<singular_concept>/record.py`,
  not loose `dict[str, Any]`, for durable state objects.
- API services under `harness/api/<surface>/service.py` may compose multiple
  repositories and convert DB records to protocol-shaped schemas at the TUI/RPC
  boundary.
- New repositories are exported from their concept package and included in the
  `Repositories` container when runtime code needs them.
- Multi-table read/composition behavior should not be modeled as a repository
  unless it owns durable state. Put it in an API service with local schemas.
- Business orchestration stays outside repositories. Repositories should create,
  update, fetch, and list persistence records; they should not decide which
  experiment to run next or whether a session should continue.
- Repository changes include at least a temp-SQLite smoke or unit test strategy
  that exercises creation, update, list/get, and API composition behavior.

## Red Flags

- Importing `sqlite3` outside `core/db/` for normal runtime persistence.
- Adding a table without a repository owner.
- Adding a new repository to the legacy flat `db/repos/` layout instead of the
  target `repositories/<concept>/` layout.
- Adding a new durable record to a broad `records.py` file instead of the target
  `records/<singular_concept>/record.py` file.
- Adding a `SnapshotsRepository` or similar repository that does not own durable
  state and only composes current API responses.
- Adding persistence fields that are written but never surfaced through API
  schemas or agent-facing context when they matter to observability.
- Reintroducing a broad catch-all state object that hides table ownership.
- Duplicating JSON serialization across repositories.
- Moving repository-specific row decoding into record models or unrelated
  shared helpers.
- Making repositories call workers, agents, TUI code, or long-running
  orchestration logic.
- Returning loose dicts from new repository methods when a DB record model
  should exist.

## Testing Expectations

For repository changes, prefer fast local checks:

- Run the full command check.
- Exercise the changed repository against a temporary SQLite file.
- Validate that API services return the expected composed schemas when
  repository data changes.
- Smoke the TUI path when runtime wiring changes.

See `.agents/docs/testing-strategy/DOC.md` for the current testing strategy.
