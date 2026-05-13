---
status: accepted
implementation_status: verified
created: 2026-05-12
---

# 0045. Validate Actors And Targets At App Action Boundaries

## Context

Packages store actor and target fields, but packages should not import each
other just to validate cross-primitive relationships. The app action boundary is
the one place that can see the composed database and the user's intent.

## Decision

App actions validate actors and targets before committing user-visible writes.

Actor validation rules:

- `system` actors use the stable app-owned system id
- local `human` actors can use stable local ids until multi-user support exists
- `agent` actors must resolve to an `Agent` row when the action relies on a real
  agent identity
- assignees and notification recipients that are agents must resolve to an
  `Agent` row

Target validation rules:

- `targetKind` must be a known common target kind
- app actions that create cross-primitive records must verify the target exists
- package repositories validate local shape but do not perform cross-package
  existence checks
- generic target links are returned to callers as typed `TargetRef` objects

Validation failures use structured errors from `@situ/errors`.

Packages should preserve their low cognitive load:

```text
package repository
  validate local row shape
  read/write package-owned rows

app action
  validate actor
  validate cross-package target
  compose package writes
  emit events/comments/notifications
```

## Consequences

The app avoids package dependency cycles while still preventing dangling
important references.

Tests for package repositories can stay package-local. Tests for cross-package
integrity live at the app action boundary.

Some weak historical references may still exist when preserving history matters
more than strict referential integrity. Those exceptions should be visible in
the action or package README.

Actor validation is product behavior. It should not be buried in a scheduler,
tool handler, or HTTP route.

## Related

- ADR 0021: Use App Actions As Shared Write Boundary
- ADR 0037: Use Target Kind And Target Id For Cross-Primitive Links
- ADR 0038: Use Actor Kind And Actor Id For Visible Actors
