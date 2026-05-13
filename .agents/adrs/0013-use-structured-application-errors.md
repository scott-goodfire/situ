---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0013. Use Structured Application Errors

## Context

Agents, CLI commands, HTTP routes, scheduler jobs, and Replicache mutations all
need to understand failures. Plain `Error` messages are easy to throw but hard
to handle consistently.

The architecture already expects typed precondition errors at repository and app
action boundaries. That should be codified as a shared package rather than
reinvented in each primitive.

## Decision

Situ will use a shared `@situ/errors` package for application errors.

The package exports:

- `ErrorKind`
- `BaseError`
- specific subclasses such as `NotFoundError`, `InvalidArgumentError`,
  `PreconditionError`, `ConflictError`, `InvariantError`, and
  `NotImplementedError`
- helpers such as `isBaseError` and `toErrorDetails`

Product code should throw `BaseError` subclasses rather than `new Error(...)`.
Framework or third-party errors may still exist at integration boundaries, but
the app should translate them before returning user-facing failures.

Errors include:

- stable `kind`
- human-readable `message`
- optional structured `details`
- optional `cause`

## Consequences

Repository `require` methods throw `NotFoundError`.

App actions throw structured errors for invalid targets, invalid arguments,
precondition failures, conflicts, and internal invariants.

CLI, HTTP, Replicache, scheduler, and agent-tool boundaries can switch on
`error.kind` instead of parsing message text.

Tests should assert `kind` and relevant `details` instead of exact prose unless
the message itself is user-facing.

Tooling should reject ordinary `throw new Error(...)` in product code except in
tests, scripts, and the `@situ/errors` implementation.

## Related

- ADR 0011: Use Mechanical Quality Gates For Code And Meta Docs
- ADR 0021: Use App Actions As Shared Write Boundary
- ADR 0022: Define Common Package Contract
