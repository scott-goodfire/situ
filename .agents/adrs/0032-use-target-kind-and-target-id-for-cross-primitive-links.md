---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0032. Use Target Kind And Target Id For Cross-Primitive Links

## Context

Several records can attach to multiple primitive kinds. Comments may attach to
tasks or projects. Reviews may attach to experiments, measurements, artifacts,
or reports. Notifications and events can point at many targets.

Hard-coding a separate nullable column for every target type would make schemas
larger and harder to evolve.

## Decision

Use explicit generic target fields for cross-primitive links:

```text
targetKind = "task" | "experiment" | "measurement" | "artifact" | ...
targetId = opaque id
```

Target kind constants live in `@situ/common` so packages can validate targets
without importing from `@situ/app`.

Initial target kinds:

- `project`
- `task`
- `comment`
- `notification`
- `experiment`
- `measurement`
- `review`
- `artifact`
- `agent`
- `agent_session`
- `event`

Use generic targets for:

- comments
- reviews
- artifacts
- notifications
- events

Use direct columns such as `taskId` or `experimentId` when the relationship is
part of the primitive's identity or common query path.

## Consequences

Cross-primitive records can attach to new target types without schema churn.

Repositories should expose typed target objects to callers rather than leaking
ad hoc strings everywhere.

Composed app schema may enforce integrity where practical without creating
package import cycles.

Repositories should validate that a target kind is known. App actions are
responsible for cross-package existence checks when a mutation needs stronger
integrity.

## Related

- ADR 0015: Packages Own Schema, App Composes Database
- ADR 0017: Define Common Package Contract
