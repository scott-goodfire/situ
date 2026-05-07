---
title: API Services And Schemas
status: active
---

# Policy: API Services And Schemas

## Applies To

Backend API composition under `projects/harness/src/situ/harness/api/**`,
schemas used by TUI, web, headless commands, RPC collection bootstrapping, and
service changes that present durable state to product surfaces.

## Rule

API services compose repository records into boundary-shaped read models.
Repositories own table-level persistence. API services own product-facing
composition. Schemas describe the boundary response, not the database row.

## Required Checks

- Stable API surfaces live under `api/<surface>/{service.py,schemas.py,__init__.py}`.
- Service classes are named `<Surface>Service` and keep public methods
  keyword-only when they accept application semantics, such as
  `get_project_board(project_id=...)`.
- Schemas are Pydantic models shaped for consumers such as the TUI, web app,
  headless commands, runtime agents, or collection snapshots.
- Services may call multiple repositories and compose records into one response
  when the read model spans concepts.
- Services do not open SQLite connections directly, issue SQL, decode rows, or
  bypass repository validation.
- Services should be deterministic and side-effect-light unless the surface is
  explicitly a mutation service.
- API responses should use project scope for normal research state. Session IDs
  are provenance and run-history details, not routine agent-facing selectors.
- Boundary schemas should use current product names such as project board,
  task, analysis, hypothesis, experiment, evaluation, measurement, artifact,
  activity, and event.
- Do not duplicate a durable record class as an API schema unless the boundary
  shape is intentionally different from the storage shape.
- UI and headless code should consume API services or generated protocol
  schemas rather than joining raw repository outputs itself.
- New API composition behavior includes service-level tests or equivalent
  smoke coverage against temporary repository state.

## Red Flags

- Direct SQL, `sqlite3`, or row decoding inside an API service.
- A repository method that exists only to assemble a multi-table dashboard
  response.
- API schemas that mirror storage rows one-for-one but are maintained as a
  separate source of truth without a boundary reason.
- Agent-facing APIs that ask models to pass session IDs for routine project
  state reads.
- Web or TUI code that reconstructs project graphs by calling many raw
  repositories directly.
- A large `api/models.py`, `api/schemas.py`, or `api/services.py` file that
  mixes unrelated surfaces.
- Mutation side effects hidden inside a read service method.

## Review Questions

- Is this code composing durable state for a consumer, or should it be a
  repository method?
- Does the schema make the consumer boundary clearer than the raw records?
- Can TUI, web, and headless surfaces share this read model?
- Does the service keep session/run mechanics internal unless the surface is
  explicitly about run history?
