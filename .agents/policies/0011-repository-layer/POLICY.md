---
title: Repository Layer
status: active
---

# Policy: Repository Layer

## Applies To

Database access, repository additions, persistence refactors, snapshots,
migrations, DBOS integration, and tests touching durable run state.

## Rule

Harness runtime code should access durable state through repositories, not
direct SQL or ad hoc SQLite handles. Repositories own table-level persistence
and read-model composition; orchestration code owns run flow.

## Required Checks

- New durable state has a clear repository owner under
  `projects/harness/src/almanac/harness/db/repos/`.
- Repository classes inherit from `BaseRepository`, which owns the shared
  `BaseModel` + `db: Database` pattern.
- SQL execution goes through `Database`; runtime code outside `db/` should not
  open SQLite connections directly.
- Schema changes live in `db/migrations.py`; JSON encoding/row decoding lives
  in `db/serialization.py` unless there is a clear reason to keep it local.
- Repository input validators live in `db/commands.py` when a method benefits
  from Pydantic validation before writing.
- Repository methods should return typed Pydantic records from `db/records.py`,
  not loose `dict[str, Any]`, for durable state objects.
- Snapshot/read-model methods may convert DB records to protocol-shaped plain
  dictionaries at the TUI/RPC boundary.
- New repositories are exported from `db/repos/__init__.py` and included in the
  `Repositories` container when runtime code needs them.
- Snapshot/read-model changes are centralized in `SnapshotsRepository`.
- Business orchestration stays outside repositories. Repositories should create,
  update, fetch, list, and compose persistence records; they should not decide
  which experiment to run next or whether a run should continue.
- Repository changes include at least a temp-SQLite smoke or unit test strategy
  that exercises creation, update, list/get, and snapshot behavior.

## Red Flags

- Importing `sqlite3` outside `db/` for normal runtime persistence.
- Adding a table without a repository owner.
- Adding persistence fields that are written but never surfaced through
  snapshots or agent-facing context when they matter to observability.
- Reintroducing a broad catch-all state object that hides table ownership.
- Duplicating JSON serialization or row mapping across repositories.
- Making repositories call workers, agents, TUI code, or long-running
  orchestration logic.
- Returning loose dicts from new repository methods when a DB record model
  should exist.

## Testing Expectations

For repository changes, prefer fast local checks:

- Run the full command check.
- Exercise the changed repository against a temporary SQLite file.
- Validate that `SnapshotsRepository.get()` returns the expected composed state.
- Smoke the TUI path when runtime wiring changes.

See `.agents/docs/testing-strategy/DOC.md` for the current testing strategy.
